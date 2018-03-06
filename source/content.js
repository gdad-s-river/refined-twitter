import domLoaded from 'dom-loaded';
import {observeEl, safeElementReady, safely} from './libs/utils';
import autoLoadNewTweets from './features/auto-load-new-tweets';
import inlineInstagramPhotos from './features/inline-instagram-photos';
import userChoiceColor from './features/user-choice-color';
import codeHighlight from './features/code-highlight';
import mentionHighlight from './features/mentions-highlight';
import addLikesButtonNavBar from './features/likes-button-navbar';
import keyboardShortcuts from './features/keyboard-shortcuts';
import onDMDialogOpen, {getConversationId} from './features/preserve-text-messages';

function cleanNavbarDropdown() {
	$('#user-dropdown').find('[data-nav="all_moments"], [data-nav="ads"], [data-nav="promote-mode"], [data-nav="help_center"]').parent().hide();
}

function hideLikeTweets() {
	$('.tweet-context .Icon--heartBadge').parents('.js-stream-item').hide();
}

function hidePromotedTweets() {
	$('.promoted-tweet').parent().remove();
}

async function init() {
	await safeElementReady('body');

	if (document.body.classList.contains('logged-out')) {
		return;
	}

	document.documentElement.classList.add('refined-twitter');

	safely(addLikesButtonNavBar);

	await domLoaded;
	onDomReady();
}

function onRouteChange(cb) {
	observeEl('#doc', cb, {attributes: true});
}

function onNewTweets(cb) {
	observeEl('#stream-items-id', cb);
}

function onSingleTweetOpen(cb) {
	observeEl('body', mutations => {
		for (const mutation of mutations) {
			if (mutation.target.classList.contains('overlay-enabled')) {
				observeEl('#permalink-overlay', cb, {attributes: true, subtree: true});
				break;
			}
		}
	}, {attributes: true});
}

function onDMDelete() {
	observeEl('body', async mutations => {
		const savedMessages = await browser.storage.local.get();
		const pendingRemoval = [];

		for (const mutation of mutations) {
			if (mutation.target.id === 'confirm_dialog') {
				const conversationId = getConversationId();
				$('#confirm_dialog_submit_button').on('click', () => {
					for (const id in savedMessages) {
						if (conversationId === id) {
							pendingRemoval.push(browser.storage.local.remove(conversationId));
						}
					}
				});

				break;
			}
		}

		await Promise.all(pendingRemoval);
	}, {childList: true, subtree: true, attributes: true});
}

function onDomReady() {
	safely(cleanNavbarDropdown);
	safely(keyboardShortcuts);

	onRouteChange(() => {
		safely(autoLoadNewTweets);
		safely(userChoiceColor);

		onNewTweets(() => {
			safely(codeHighlight);
			safely(mentionHighlight);
			safely(hideLikeTweets);
			safely(inlineInstagramPhotos);
			safely(hidePromotedTweets);
		});
	});

	onSingleTweetOpen(() => {
		safely(codeHighlight);
		safely(mentionHighlight);
		safely(inlineInstagramPhotos);
	});

	safely(onDMDialogOpen);
	safely(onDMDelete);
}

init();

