import domLoaded from 'dom-loaded';
import debounce from 'lodash.debounce';

import {
	observeEl, 
	safeElementReady, 
	safely, 
	getFromLocalStorage, 
	setToLocalStorage
} from './libs/utils';

import autoLoadNewTweets from './features/auto-load-new-tweets';
import inlineInstagramPhotos from './features/inline-instagram-photos';
import userChoiceColor from './features/user-choice-color';
import codeHighlight from './features/code-highlight';
import mentionHighlight from './features/mentions-highlight';
import addLikesButtonNavBar from './features/likes-button-navbar';
import keyboardShortcuts from './features/keyboard-shortcuts';
// import {onDMDialogOpen, onDMDelete} from './features/preserve-text-messages';
import renderInlineCode from './features/inline-code';
import disableCustomColors from './features/disable-custom-colors';

import {
	removeMessages,
	idsOfNonEmptyMsgs,
	idsOfNotDeletedMsgs,
	restoreSavedMessage,
	handleMessageChange,
} from './features/preserve-text-messages';

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
			const {classList} = mutation.target;
			if (classList.contains('overlay-enabled')) {
				observeEl('#permalink-overlay', cb, {attributes: true, subtree: true});
				break;
			} else if (classList.contains('modal-enabled')) {
				observeEl('#global-tweet-dialog', cb, {attributes: true, subtree: true});
				break;
			}
		}
	}, {attributes: true});
}

function removeProfileHeader() {
	$('.ProfileCanopy-header .ProfileCanopy-avatar').appendTo('.ProfileCanopy-inner .AppContainer');
	$('.ProfileCanopy-header').remove();
}

// let DMDialogueOpen = false;

function onDMDialogOpenAndClose(handleOpen, handleClose) {
	observeEl('#dm_dialog', async mutations => {
		for (const mutation of mutations) {
			if (mutation.target.style.display === 'none') {
				// DMDialogueOpen = false;
				const DMModalStatus = {isDMModalOpen: false};
				
				setToLocalStorage({DMModalStatus});
				handleClose();
				break;
			} else {
				// DMDialogueOpen = true;
				const DMModalStatus = {isDMModalOpen: true};
				
				setToLocalStorage({DMModalStatus});				
				const DMOpenMutationOptions = {
					attributes: true,
					attributeFilter: ['class']
				};
			
				observeEl('.DMConversation', mutations => {
					for (const mutation of mutations) {
						if (mutation.target.classList.contains('DMActivity--open')) {
							handleOpen(); // fetchStoredMessage , onMessageChange
							break;
						}
					}
				}, DMOpenMutationOptions);

				break;
			}
		}
	}, {attributes: true});
}

function onMessageChange(cb) {
	const msgChangeMutationOptions = {
		childList: true,
		subtree: true,
		characterData: true
	};

	observeEl('#tweet-box-dm-conversation', debounce(async () => {
		cb();
	}, 150), msgChangeMutationOptions);
}

const handleDMWindowOpen = () => {
	safely(restoreSavedMessage);

	let isDMModalOpen = true;

	// start listening for DMModalStatus changes
	// we need this to pass onto handleMessageChange
	// see handleMessageChange definition to know why
	browser.storage.onChanged.addListener((changes, area) => {
		if (
			area === 'local'
			&& (changes.DMModalStatus && changes.DMModalStatus.newValue)
		) {
			isDMModalOpen = changes.DMModalStatus.newValue.isDMModalOpen;
		}
	});

	onMessageChange(() => {
		safely(() => handleMessageChange(isDMModalOpen));
	})
};

function onMessageDelete(cb) {
	const messageDelMutatioOptions = {
		childList: true,
		subtree: true,
		attributes: true
	};

	observeEl('body', async mutations => {
		for (const mutation of mutations) {
			if (mutation.target.id === 'confirm_dialog') {
				$('#confirm_dialog_submit_button').on('click', () => {
					cb(); // remove the msg which is deleted
				});
	
				break;
			}
		}
	}, messageDelMutatioOptions);
}

const handleDMWindowClose = () => {
	safely(() => removeMessages(idsOfNonEmptyMsgs));
}

function onDomReady() {
	safely(cleanNavbarDropdown);
	safely(keyboardShortcuts);

	onRouteChange(() => {
		safely(autoLoadNewTweets);
		safely(userChoiceColor);
		safely(disableCustomColors);
    safely(removeProfileHeader);

		onNewTweets(() => {
			safely(codeHighlight);
			safely(mentionHighlight);
			safely(hideLikeTweets);
			safely(inlineInstagramPhotos);
			safely(hidePromotedTweets);
			safely(renderInlineCode);
		});
	});

	onSingleTweetOpen(() => {
		safely(codeHighlight);
		safely(mentionHighlight);
		safely(inlineInstagramPhotos);
		safely(renderInlineCode);
	});

	onDMDialogOpenAndClose(
		handleDMWindowOpen,
		handleDMWindowClose
	);

	onMessageDelete(() => {
		removeMessages(idsOfNotDeletedMsgs);
	});
}

init();
