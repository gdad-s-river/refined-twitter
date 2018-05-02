import pick from 'lodash.pick';

import {
	observeEl,
	getFromLocalStorage,
	setToLocalStorage
} from '../libs/utils';

export async function removeMessages(refinedMsgIdsMaker) {
	const {messages: savedMessages} = await getFromLocalStorage('messages');

	if (!savedMessages) {
		return;
	}

	const idsOfMsgToReSave = refinedMsgIdsMaker(savedMessages);

	const updatedMessages = {
		messages: pick(savedMessages, idsOfMsgToReSave)
	}

	console.log('setting to localstorage');
	setToLocalStorage(updatedMessages);
}

export function idsOfNonEmptyMsgs(savedMessages) {
	return Object.keys(savedMessages)
		.filter(id => !isEmptyMsgInput(savedMessages[id]));
}

export function idsOfNotDeletedMsgs(savedMessages) {
	return Object.keys(savedMessages)
		.filter(id => id !== getConversationId())
}

// See: https://gist.github.com/al3x-edge/1010364
export function setCursorToEnd(contentEditableElement) {
	const range = document.createRange();
	const selection = window.getSelection();
	range.selectNodeContents(contentEditableElement);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
}

function getConversationId() {
	return document.querySelector('.DMConversation').dataset.threadId;
}

function getMessageContainer() {
	return $('#tweet-box-dm-conversation');
}

export function isEmptyMsgInput(message) {
	const messageEl = document.createElement('div');
	messageEl.innerHTML = message;
	return messageEl.textContent === '';
}

export async function restoreSavedMessage() {
	const conversationId = getConversationId();
	const messageContainer = getMessageContainer();
	// TODO: see if this check is necessary
	if (conversationId) {
		const {messages: savedMessages} = await getFromLocalStorage('messages');

		if (!savedMessages) {
			return;
		}

		const {[conversationId]: savedMessage} = savedMessages;

		if (savedMessage && !isEmptyMsgInput(savedMessage)) {
			// put message inside container
			fillContainerWithMessage(messageContainer, savedMessage);
		}
	}
}

export async function handleMessageChange() {
	const conversationId = getConversationId();
	const currentMessage = getMessageContainer().html();

	// read all previously saved messages
	const {messages: savedMessages} = await getFromLocalStorage('messages');

	const updatedMessages = {
		messages: Object.assign((savedMessages || {}), {[conversationId]: currentMessage})
	}

	console.log('setting to localstorage');
	// dangerous -> not checking DMDialogOpen boolean

		// should only store if window is open;
	console.log(document.querySelector('#dm_dialog').style.display);
	setToLocalStorage(updatedMessages);

}

function fillContainerWithMessage(messageContainer, savedMessage) {
	messageContainer.empty();
	messageContainer.append(savedMessage);
	setCursorToEnd(messageContainer[0]);
}