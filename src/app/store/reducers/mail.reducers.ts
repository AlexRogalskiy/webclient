import { MailActions, MailActionTypes } from '../actions';
import { FolderState, MailState, PGPEncryptionType, SecureContent } from '../datatypes';
import { Attachment, EmailDisplay, Mail, MailFolderType, OrderBy } from '../models';
import { FilenamePipe } from '../../shared/pipes/filename.pipe';

/**
 ---Start Reducer Utilities---
 * */
function transformFilename(attachments: Attachment[]) {
  if (attachments && attachments.length > 0) {
    attachments = attachments.map(attachment => {
      if (!attachment.name) {
        attachment.name = FilenamePipe.tranformToFilename(attachment.document);
      }
      return attachment;
    });
  }
  return attachments;
}

function sortByDueDateWithID(sortArray: Array<number>, mailMap: any): any[] {
  const mails = sortArray
    .map(mailID => {
      if (Object.prototype.hasOwnProperty.call(mailMap, mailID)) {
        return mailMap[mailID];
      }
      return null;
    })
    .filter(mail => !!mail);
  const sorted = mails
    .sort((previous: any, next: any) => {
      const nextUpdated = next.updated || 0;
      const previousUpdated = previous.updated || 0;
      return <any>new Date(nextUpdated) - <any>new Date(previousUpdated);
    })
    .map(mail => mail.id);
  return sorted;
}

function getTotalUnreadCount(data: any): number {
  if (data) {
    let totalCount = 0;
    for (const key of Object.keys(data)) {
      if (
        key !== MailFolderType.SENT &&
        key !== MailFolderType.TRASH &&
        key !== MailFolderType.DRAFT &&
        key !== MailFolderType.OUTBOX &&
        key !== MailFolderType.SPAM &&
        key !== 'total_unread_count' &&
        key !== MailFolderType.STARRED &&
        key !== 'updateUnreadCount' &&
        key !== 'outbox_dead_man_counter' &&
        key !== 'outbox_delayed_delivery_counter' &&
        key !== 'outbox_self_destruct_counter' &&
        !Number.isNaN(data[`${key}`])
      ) {
        totalCount += data[`${key}`];
      }
    }

    return totalCount;
  }
  return 0;
}

function updateMailMap(currentMap: any, mails: Mail[]): any {
  if (mails && mails.length > 0) {
    let temporaryMailMap = {};
    for (const mail of mails) {
      temporaryMailMap = { ...temporaryMailMap, [mail.id]: mail };
    }
    return { ...currentMap, ...temporaryMailMap };
  }
  return currentMap;
}

function filterAndMergeMailIDs(
  newMails: Array<Mail>,
  originalMailIDs: Array<number>,
  limit: number,
  checkUnread = false,
): Array<number> {
  let mailIDs = newMails.filter(mail => (checkUnread ? !mail.read : true)).map(mail => mail.id);
  const newMailsMap: any = {};
  for (const mail of newMails) {
    newMailsMap[mail.id] = mail;
  }
  if (originalMailIDs && originalMailIDs.length > 0) {
    originalMailIDs = originalMailIDs.filter(id => !mailIDs.includes(id));
    mailIDs = mailIDs.map(mailID => {
      const newMail = newMailsMap[mailID];
      if (newMail.parent && originalMailIDs.includes(newMail.parent)) {
        originalMailIDs = originalMailIDs.filter(originMailID => originMailID !== newMail.parent);
        return newMail.parent;
      }
      return mailID;
    });
    originalMailIDs = [...mailIDs, ...originalMailIDs];
    if (originalMailIDs.length > limit) {
      originalMailIDs = originalMailIDs.slice(0, limit);
    }
    return originalMailIDs;
  }
  return mailIDs;
}

function getUpdatesFolderMap(
  newMails: Array<Mail>,
  originalFolderState: FolderState,
  limit: number,
  checkUnread = false,
  isConversationViewMode = true,
): any {
  let originalMailIDs = originalFolderState.mails;
  let mailIDs = newMails.filter(mail => (checkUnread ? !mail.read : true)).map(mail => mail.id);
  const newMailsMap: any = {};

  for (const mail of newMails) {
    newMailsMap[mail.id] = mail;
  }
  if (originalMailIDs && originalMailIDs.length > 0) {
    // Remove duplicated mails
    let duplicatedMailIDS: any = [];
    originalMailIDs = originalMailIDs.filter(id => {
      if (!mailIDs.includes(id)) {
        return true;
      }
      duplicatedMailIDS = [...duplicatedMailIDS, id];
      return false;
    });
    // Check children mails
    // If new's parent is same with any original mail
    // Replace it with original mail on new mail array
    let parentWithChild: any = [];
    if (isConversationViewMode) {
      mailIDs = mailIDs.map(mailID => {
        const newMail = newMailsMap[mailID];
        if (newMail.parent && originalMailIDs.includes(newMail.parent)) {
          originalMailIDs = originalMailIDs.filter(originMailID => originMailID !== newMail.parent);
          parentWithChild = [...parentWithChild.filter((item: any) => newMail.parent !== item), newMail.parent];
          return newMail.parent;
        }
        return mailID;
      });
    }
    // Merge new with old
    originalMailIDs = [...mailIDs, ...originalMailIDs];
    // Check overflow
    if (originalMailIDs.length > limit) {
      originalMailIDs = originalMailIDs.slice(0, limit);
    }
    const totalMailCount =
      (originalFolderState.total_mail_count ? originalFolderState.total_mail_count : 0) +
        mailIDs.length -
        parentWithChild.length -
        duplicatedMailIDS.length >=
      0
        ? (originalFolderState.total_mail_count ? originalFolderState.total_mail_count : 0) +
          mailIDs.length -
          parentWithChild.length -
          duplicatedMailIDS.length
        : 0;
    return {
      mails: originalMailIDs,
      total_mail_count: totalMailCount,
    };
  }
  return {
    mails: mailIDs,
    total_mail_count: mailIDs.length,
  };
}

function prepareMails(folderName: MailFolderType, folders: Map<string, FolderState>, mailMap: any): Array<Mail> {
  if (folders.has(folderName)) {
    const folderInfo = folders.get(folderName);
    const mails = folderInfo.mails
      .map(mailID => {
        const mail = mailMap[mailID] ? mailMap[mailID] : null;
        if (mail) {
          mail.receiver_list = mail.receiver_display.map((item: EmailDisplay) => item.name).join(', ');
          if (mail.children_folder_info) {
            if (folderName === MailFolderType.TRASH && mail.folder === MailFolderType.TRASH) {
              mail.thread_count = mail.children_folder_info ? mail.children_folder_info.trash_children_count + 1 : 0;
            } else if (folderName === MailFolderType.TRASH && mail.folder !== MailFolderType.TRASH) {
              mail.thread_count = mail.children_folder_info ? mail.children_folder_info.trash_children_count : 0;
            } else if (folderName !== MailFolderType.TRASH && mail.folder !== MailFolderType.TRASH) {
              mail.thread_count = mail.children_folder_info
                ? mail.children_folder_info.non_trash_children_count + 1
                : 0;
            } else if (folderName !== MailFolderType.TRASH && mail.folder === MailFolderType.TRASH) {
              mail.thread_count = mail.children_folder_info ? mail.children_folder_info.non_trash_children_count : 0;
            }
          }
        }
        return mail;
      })
      .filter(mail => mail !== null);
    return mails;
  }
  return [];
}

/**
 ---End Reducer Utilities---
 * */

export function reducer(
  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  state: MailState = {
    mails: [],
    total_mail_count: 0,
    mailDetail: undefined,
    starredFolderCount: 0,
    loaded: false,
    decryptedContents: {},
    unreadMailsCount: { inbox: 0 },
    noUnreadCountChange: true,
    canGetUnreadCount: true,
    decryptedSubjects: {},
    isMailsMoved: false,
    customFolderMessageCount: [],
    isComposerPopUp: false,
    mailMap: {},
    folderMap: new Map(),
    pageLimit: 20,
    decryptedAttachmentsMap: new Map(),
    orderBy: OrderBy.ASC,
  },
  action: MailActions,
): MailState {
  switch (action.type) {
    case MailActionTypes.GET_MAILS: {
      let mails = prepareMails(action.payload.folder, state.folderMap, state.mailMap);
      if (mails && mails.length === 0) {
        mails = undefined;
      }
      return {
        ...state,
        loaded: !!(mails && !action.payload.forceReload),
        inProgress: !!action.payload.inProgress,
        currentFolder: action.payload.folder as MailFolderType,
        mails: mails || [],
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.GET_MAILS_SUCCESS: {
      const payloadMails = action.payload.mails;
      const mailMap = updateMailMap(state.mailMap, payloadMails);
      const folderMap = new Map(state.folderMap);
      // Update Folder Map for ###TARGET FOLDER###
      if (!action.payload.is_from_socket || (action.payload.is_from_socket && folderMap.has(action.payload.folder))) {
        const oldFolderInfo = folderMap.get(action.payload.folder);
        const mailIDS = action.payload.is_from_socket
          ? oldFolderInfo && !oldFolderInfo.is_not_first_page
            ? filterAndMergeMailIDs(payloadMails, oldFolderInfo.mails, action.payload.limit)
            : oldFolderInfo.mails
          : payloadMails.map((mail: any) => mail.id);
        const folderState = {
          mails: mailIDS,
          total_mail_count: action.payload.total_mail_count ? action.payload.total_mail_count : 0,
          is_not_first_page: action.payload.is_from_socket
            ? oldFolderInfo && oldFolderInfo.is_not_first_page
            : action.payload.is_not_first_page,
          offset: action.payload.offset,
          is_dirty: false,
        };
        folderMap.set(`${action.payload.folder}`, folderState);
      }

      // Update Folder Map for ###UNREAD FOLDER###
      if (
        action.payload.is_from_socket &&
        action.payload.folder !== MailFolderType.UNREAD &&
        action.payload.folder !== MailFolderType.SPAM &&
        folderMap.has(MailFolderType.UNREAD)
      ) {
        const oldFolderInfo = folderMap.get(MailFolderType.UNREAD);
        const basicFolderState = getUpdatesFolderMap(payloadMails, oldFolderInfo, action.payload.limit, true);
        const folderState = {
          ...oldFolderInfo,
          mails: basicFolderState.mails,
          total_mail_count: basicFolderState.total_mail_count ? basicFolderState.total_mail_count : 0,
        };
        folderMap.set(MailFolderType.UNREAD, folderState);
      }
      // Update Folder Map for ###ALL EMAILS FOLDER###
      if (
        action.payload.is_from_socket &&
        action.payload.folder !== MailFolderType.ALL_EMAILS &&
        action.payload.folder !== MailFolderType.SPAM &&
        folderMap.has(MailFolderType.ALL_EMAILS)
      ) {
        const oldFolderInfo = folderMap.get(MailFolderType.ALL_EMAILS);
        const basicFolderState = getUpdatesFolderMap(payloadMails, oldFolderInfo, action.payload.limit);
        const folderState = {
          ...oldFolderInfo,
          mails: basicFolderState.mails,
          total_mail_count: basicFolderState.total_mail_count ? basicFolderState.total_mail_count : 0,
        };
        folderMap.set(MailFolderType.ALL_EMAILS, folderState);
      }
      // Update Current Viewing Folder
      const mails = prepareMails(state.currentFolder, folderMap, mailMap);
      const currentFolderMap = folderMap.get(state.currentFolder);
      state.total_mail_count = currentFolderMap?.total_mail_count ? currentFolderMap?.total_mail_count : 0;
      mails.forEach((mail: Mail) => {
        mail.receiver_list = mail.receiver_display.map((item: EmailDisplay) => item.name).join(', ');
        if (mail.is_subject_encrypted && state.decryptedSubjects[mail.id]) {
          mail.subject = state.decryptedSubjects[mail.id];
          mail.is_subject_encrypted = false;
        }
      });
      state.pageLimit = action.payload.limit;
      return {
        ...state,
        mails,
        loaded: true,
        inProgress: false,
        noUnreadCountChange: true,
        mailMap,
        folderMap,
      };
    }

    case MailActionTypes.STOP_GETTING_UNREAD_MAILS_COUNT: {
      return {
        ...state,
        canGetUnreadCount: false,
      };
    }

    case MailActionTypes.REVERT_CHILD_MAIL_ORDER: {
      return {
        ...state,
        orderBy: action.payload.orderBy,
      };
    }

    case MailActionTypes.STARRED_FOLDER_COUNT_UPDATE: {
      return { ...state, starredFolderCount: action.payload.starred_count };
    }

    case MailActionTypes.GET_UNREAD_MAILS_COUNT: {
      return { ...state, noUnreadCountChange: false };
    }
    case MailActionTypes.GET_UNREAD_MAILS_COUNT_SUCCESS: {
      if (action.payload.updateUnreadCount) {
        const totalUnreadMailCount = getTotalUnreadCount({ ...state.unreadMailsCount, ...action.payload });
        const unreadMailData = {
          ...state.unreadMailsCount,
          ...action.payload,
          total_unread_count: totalUnreadMailCount,
        };
        return {
          ...state,
          unreadMailsCount: unreadMailData,
          noUnreadCountChange: false,
        };
      }
      return {
        ...state,
        unreadMailsCount: { ...action.payload, total_unread_count: getTotalUnreadCount(action.payload) },
        noUnreadCountChange: false,
      };
    }
    case MailActionTypes.GET_CUSTOMFOLDER_MESSAGE_COUNT_SUCCESS: {
      return { ...state, customFolderMessageCount: action.payload };
    }
    case MailActionTypes.SET_IS_COMPOSER_POPUP: {
      state.isComposerPopUp = action.payload;
      return {
        ...state,
      };
    }
    case MailActionTypes.MOVE_MAIL: {
      return { ...state, inProgress: true, noUnreadCountChange: true, isMailsMoved: false };
    }

    case MailActionTypes.REVERT_MAILS_MOVED: {
      return { ...state, isMailsMoved: false };
    }

    case MailActionTypes.MOVE_MAIL_SUCCESS: {
      const listOfIDs = action.payload.ids.toString().split(',');
      const { folderMap } = state;
      const { mailMap, pageLimit, currentFolder, mailDetail } = state;

      // Update source folder's mails
      const sourceFolderName = action.payload.sourceFolder;
      if (sourceFolderName && folderMap.has(sourceFolderName)) {
        const sourceFolderState = folderMap.get(sourceFolderName);
        sourceFolderState.mails = sourceFolderState.mails.filter(mail => !listOfIDs.includes(mail.toString()));
        sourceFolderState.total_mail_count =
          sourceFolderState.total_mail_count >= listOfIDs.length
            ? sourceFolderState.total_mail_count - listOfIDs.length
            : 0;
        folderMap.set(sourceFolderName, sourceFolderState);
      }
      // Update target folder's mails
      const targetFolderName = action.payload.folder;
      if (targetFolderName && folderMap.has(targetFolderName)) {
        const targetFolderState = folderMap.get(targetFolderName);
        const movedMails = listOfIDs
          .map((movedID: any) => (mailMap[movedID] ? mailMap[movedID] : null))
          .filter((mail: any) => !!mail);
        const basicFolderState = getUpdatesFolderMap(movedMails, targetFolderState, pageLimit);
        const folderState = {
          ...targetFolderState,
          mails: sortByDueDateWithID(basicFolderState.mails, mailMap),
          total_mail_count: basicFolderState.total_mail_count,
        };
        folderMap.set(targetFolderName, folderState);
      }
      // Update other folders
      const folderKeys = [...folderMap.keys()].filter(
        key => key !== sourceFolderName && key !== targetFolderName && key !== currentFolder,
      );

      for (const key of folderKeys) {
        const folderInfo = folderMap.get(key);
        folderInfo.is_dirty = true;
        folderInfo.mails = [];
        folderMap.set(key, folderInfo);
      }
      // Update mail map
      const mailMapKeys = Object.keys(mailMap);

      for (const key of mailMapKeys) {
        if (listOfIDs.includes(mailMap[key].id.toString())) {
          mailMap[key] = { ...mailMap[key], folder: action.payload.folder };
          if (
            action.payload.folder === MailFolderType.TRASH &&
            mailMap[key].has_children &&
            mailMap[key].children_count > 0 &&
            action.payload.withChildren !== false
          ) {
            // If moving parent to trash, children would be moved to trash as well
            mailMap[key].children_folder_info = {
              trash_children_count: mailMap[key].children_count,
              non_trash_children_count: 0,
            };
          } else if (
            action.payload.sourceFolder === MailFolderType.TRASH &&
            mailMap[key].has_children &&
            mailMap[key].children_count > 0
          ) {
            // If moving parent from trash, children would be moved as well
            mailMap[key].children_folder_info = {
              trash_children_count: 0,
              non_trash_children_count: mailMap[key].children_count,
            };
          }
        }
      }
      // This is to move to trash only child from any folder
      // should update children_folder_info as well
      const incomeMails = Array.isArray(action.payload.mail) ? action.payload.mail : [action.payload.mail];
      incomeMails.forEach((mail: any) => {
        if (action.payload.folder === MailFolderType.TRASH && mail.parent) {
          const parentID = mail.parent;
          if (mailMap[parentID] && mailMap[parentID].children_folder_info) {
            mailMap[parentID].children_folder_info = {
              trash_children_count: mailMap[parentID].children_folder_info.trash_children_count + 1,
              non_trash_children_count:
                mailMap[parentID].children_folder_info.non_trash_children_count > 0
                  ? mailMap[parentID].children_folder_info.non_trash_children_count - 1
                  : 0,
            };
          }
        }
      });
      const mails = prepareMails(currentFolder, folderMap, mailMap);
      const currentMailFolder = folderMap.get(currentFolder);
      state.total_mail_count = currentMailFolder ? currentMailFolder.total_mail_count : 0;
      if (
        mailDetail &&
        mailDetail.children &&
        mailDetail.children.some(child => listOfIDs.includes(child.id.toString()))
      ) {
        for (const [index, child] of mailDetail.children.entries()) {
          if (listOfIDs.includes(child.id.toString())) {
            mailDetail.children[index] = { ...mailDetail.children[index], folder: action.payload.folder };
            mailDetail.children_count = mailDetail.children.length;
          }
        }
        const sourceFolderChildren = mailDetail.children.filter(child => child.folder === sourceFolderName);
        if (sourceFolderName && folderMap.has(sourceFolderName)) {
          const sourceFolderState = folderMap.get(sourceFolderName);
          sourceFolderState.mails = sourceFolderState.mails.filter(mailID => {
            if (mailID === mailDetail.id && sourceFolderChildren.length === 0) {
              return false;
            }
            return true;
          });
          folderMap.set(sourceFolderName, sourceFolderState);
        }
      }
      if (mailDetail && listOfIDs.includes(mailDetail.id.toString())) {
        state.mailDetail = { ...mailDetail, folder: action.payload.folder };
      }

      return {
        ...state,
        mails,
        mailMap,
        folderMap,
        inProgress: false,
        noUnreadCountChange: true,
        isMailsMoved: true,
      };
    }

    case MailActionTypes.UNDO_DELETE_MAIL_SUCCESS: {
      let { mails } = state;
      const { mailMap } = state;
      const undoMails = Array.isArray(action.payload.mail) ? action.payload.mail : [action.payload.mail];
      const { folderMap, pageLimit, currentFolder, mailDetail } = state;
      // Destination folder map
      if (folderMap.has(action.payload.sourceFolder)) {
        const oldFolderMap = folderMap.get(action.payload.sourceFolder);
        const basicFolderState = getUpdatesFolderMap(undoMails, oldFolderMap, pageLimit);
        basicFolderState.mails = sortByDueDateWithID(basicFolderState.mails, mailMap);
        folderMap.set(action.payload.sourceFolder, basicFolderState);
      }
      // Source folder map
      if (folderMap.has(action.payload.folder)) {
        const oldFolderMap = folderMap.get(action.payload.folder);
        oldFolderMap.mails = [];
        oldFolderMap.is_dirty = true;
        folderMap.set(action.payload.folder, oldFolderMap);
      }
      // Update mail children info
      undoMails.forEach((mail: any) => {
        if (
          action.payload.sourceFolder === MailFolderType.TRASH &&
          mail.has_children &&
          mail.children_count > 0 && // Action from the other to Trash folder (undo from trash to the other folder)
          // All children would be set with Trash again
          // TODO, needs to get which chilren are needed to undo exactly
          mailMap[mail.id]
        ) {
          mailMap[mail.id].children_folder_info = {
            trash_children_count: mailMap[mail.id].children_count,
            non_trash_children_count: 0,
          };
        }
      });
      // Update current folder map
      if (action.payload.sourceFolder === currentFolder) {
        mails = prepareMails(action.payload.sourceFolder, folderMap, state.mailMap);
        const currentMailFolder = folderMap.get(currentFolder);
        state.total_mail_count = currentMailFolder ? currentMailFolder.total_mail_count : 0;
      }
      const listOfIDs = action.payload.ids.toString().split(',');
      if (
        mailDetail &&
        mailDetail.children &&
        mailDetail.children.some(child => listOfIDs.includes(child.id.toString()))
      ) {
        for (const [index, child] of mailDetail.children.entries()) {
          if (listOfIDs.includes(child.id.toString())) {
            mailDetail.children[index] = {
              ...mailDetail.children[index],
              folder: action.payload.sourceFolder,
            };
          }
        }
      }
      if (mailDetail && listOfIDs.includes(mailDetail.id.toString())) {
        state.mailDetail = { ...mailDetail, folder: action.payload.sourceFolder };
      }
      return {
        ...state,
        mails,
        folderMap,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.READ_MAIL_SUCCESS: {
      const listOfIDs = action.payload.ids.split(',');
      const { folderMap } = state;
      const { mailMap, currentFolder, mailDetail } = state;
      const allIDS = Object.keys(mailMap);
      for (const mailID of allIDS) {
        if (listOfIDs.includes(mailID.toString())) {
          mailMap[mailID] = { ...mailMap[mailID], read: action.payload.read };
        }
      }

      // Update Unread folder
      if (currentFolder !== MailFolderType.UNREAD) {
        if (folderMap.has(MailFolderType.UNREAD)) {
          // TODO should update manually
          const unreadFolderMap = folderMap.get(MailFolderType.UNREAD);
          unreadFolderMap.is_dirty = true;
          folderMap.set(MailFolderType.UNREAD, unreadFolderMap);
        }
      } else {
        const currentFolderInfo = folderMap.get(MailFolderType.UNREAD);
        let updatedMailCount = 0;
        const updatedCurrentFolderMails = currentFolderInfo.mails.filter(mailID => {
          if (listOfIDs.includes(mailID.toString()) && action.payload.read) {
            updatedMailCount += 1;
            return false;
          }
          return true;
        });
        currentFolderInfo.mails = updatedCurrentFolderMails;
        if (action.payload.read) {
          currentFolderInfo.total_mail_count =
            currentFolderInfo.total_mail_count >= updatedMailCount
              ? currentFolderInfo.total_mail_count - updatedMailCount
              : 0;
        }
        folderMap.set(MailFolderType.UNREAD, currentFolderInfo);
      }
      const mails = prepareMails(currentFolder, folderMap, mailMap);
      const currentMailFolder = folderMap.get(currentFolder);
      state.total_mail_count = currentMailFolder ? currentMailFolder.total_mail_count : 0;

      if (mailDetail && listOfIDs.includes(mailDetail.id.toString())) {
        state.mailDetail = { ...mailDetail, read: action.payload.read };
      }

      return {
        ...state,
        mails,
        mailMap,
        folderMap,
        inProgress: false,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.STAR_MAIL_SUCCESS: {
      const listOfIDs = action.payload.ids.split(',');
      const { folderMap } = state;
      const { mailMap, currentFolder } = state;
      let { mailDetail } = state;
      const allIDS = Object.keys(mailMap);
      for (const mailID of allIDS) {
        if (listOfIDs.includes(mailID.toString())) {
          const hasStarredChildren = !(!action.payload.starred && action.payload.withChildren);
          mailMap[mailID] = {
            ...mailMap[mailID],
            starred: action.payload.starred,
            has_starred_children: hasStarredChildren,
          };
        }
      }

      // Update Star folder
      if (currentFolder !== MailFolderType.STARRED) {
        if (folderMap.has(MailFolderType.STARRED)) {
          // TODO should update manually
          const starredFolderMap = folderMap.get(MailFolderType.STARRED);
          starredFolderMap.is_dirty = true;
          folderMap.set(MailFolderType.STARRED, starredFolderMap);
        }
      } else {
        const currentFolderInfo = folderMap.get(MailFolderType.STARRED);
        let updatedMailCount = 0;
        const updatedCurrentFolderMails = currentFolderInfo.mails.filter(mailID => {
          if (listOfIDs.includes(mailID.toString()) && !action.payload.starred) {
            updatedMailCount += 1;
            return false;
          }
          if (mailDetail && mailID === mailDetail.id) {
            const { children } = mailDetail;
            if (children && children.length > 0) {
              for (const [index, child] of children.entries()) {
                if (listOfIDs.includes(child.id.toString())) {
                  children[index] = { ...child, starred: action.payload.starred };
                }
              }
              return children.some(child => child.starred);
            }
          }
          return true;
        });
        if (!action.payload.starred) {
          currentFolderInfo.total_mail_count =
            currentFolderInfo.total_mail_count >= updatedMailCount
              ? currentFolderInfo.total_mail_count - updatedMailCount
              : 0;
        }
        currentFolderInfo.mails = updatedCurrentFolderMails;
        folderMap.set(MailFolderType.STARRED, currentFolderInfo);
      }

      if (mailDetail) {
        const { children, starred } = mailDetail;
        // eslint-disable-next-line unicorn/consistent-destructuring
        if (listOfIDs.includes(mailDetail.id.toString())) {
          if (action.payload.withChildren && children && children.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [index, child] of children.entries()) children[index].starred = action.payload.starred;
          }
          const hasStarredChildren =
            children && children.length > 0
              ? children.some(child => child.starred) || action.payload.starred
              : action.payload.starred;
          state.mailDetail = {
            ...mailDetail,
            starred: action.payload.starred,
            children,
            has_starred_children: hasStarredChildren,
          };
        } else if (children && children.length > 0) {
          for (const [index, child] of children.entries()) {
            if (listOfIDs.includes(child.id.toString())) {
              children[index] = { ...child, starred: action.payload.starred };
            }
          }
          const hasStarredChildren = children.some(child => child.starred) || starred;
          mailDetail = { ...mailDetail, children, has_starred_children: hasStarredChildren };
          // eslint-disable-next-line unicorn/consistent-destructuring
          if (mailDetail.id in mailMap) {
            // eslint-disable-next-line unicorn/consistent-destructuring
            mailMap[mailDetail.id] = { ...mailMap[mailDetail.id], has_starred_children: hasStarredChildren };
          }
        }
      }

      const mails = prepareMails(state.currentFolder, folderMap, mailMap);
      const currentMailFolder = folderMap.get(state.currentFolder);
      state.total_mail_count = currentMailFolder ? currentMailFolder.total_mail_count : 0;

      return {
        ...state,
        mails,
        mailMap,
        folderMap,
        inProgress: false,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.DELETE_MAIL_FOR_ALL_SUCCESS:
    case MailActionTypes.DELETE_MAIL_SUCCESS: {
      const listOfIDs = action.payload.ids.split(',');
      const folderMap = new Map(state.folderMap);
      const mailMap = { ...state.mailMap };
      const folderKeys = [MailFolderType.DRAFT, MailFolderType.TRASH, MailFolderType.SPAM];
      for (const key of folderKeys) {
        if (folderMap.has(key)) {
          const folderInfo = folderMap.get(key);
          folderInfo.mails = folderInfo.mails.filter(mailID => !listOfIDs.includes(mailID.toString()));
          folderInfo.total_mail_count = folderInfo.total_mail_count > 0 ? folderInfo.total_mail_count - 1 : 0;
          folderInfo.is_dirty = true;
          folderMap.set(key, folderInfo);
        }
      }

      // when the mail is deleted from draft,
      // update the thread count of the parent if available
      // Message thread count does not auto-update #1566
      if (action.payload.folder === MailFolderType.DRAFT) {
        Object.values(mailMap)
          .filter((mail: any) => mail.parent && mailMap[mail.parent]) // check if there's a parent
          .map((mail: any) => mailMap[mail.parent]) // get the parent
          .filter((parent: any) => parent.children_folder_info) // ignore if children_folder_info is unavailable
          .forEach((parent: any) => {
            parent.children_folder_info = { // update children_folder_info
              trash_children_count: parent.children_folder_info.trash_children_count + 1,
              non_trash_children_count: Math.max(parent.children_folder_info.non_trash_children_count - 1, 0),
            };
          });
      }

      const mails = prepareMails(state.currentFolder, folderMap, mailMap);
      const currentMailFolder = folderMap.get(state.currentFolder);
      state.total_mail_count = currentMailFolder ? currentMailFolder.total_mail_count : 0;
      if (
        !action.payload.isDraft &&
        state.mailDetail &&
        state.mailDetail.children &&
        state.mailDetail.children.some(child => listOfIDs.includes(child.id.toString()))
      ) {
        state.mailDetail.children = state.mailDetail.children.filter(child => !listOfIDs.includes(child.id.toString()));
        state.mailDetail.children_count = state.mailDetail.children.length;
      }

      return {
        ...state,
        mails,
        folderMap,
        mailMap,
        inProgress: false,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.GET_MAIL_DETAIL_SUCCESS: {
      const { decryptedAttachmentsMap, decryptedSubjects } = state;
      const mail: Mail = action.payload;
      if (mail) {
        if (mail.is_subject_encrypted && decryptedSubjects[mail.id]) {
          mail.is_subject_encrypted = false;
          mail.subject = decryptedSubjects[mail.id];
        }
        mail.attachments =
          mail.encryption_type === PGPEncryptionType.PGP_MIME &&
          decryptedAttachmentsMap.has(mail.id) &&
          decryptedAttachmentsMap.get(mail.id).length > 0
            ? decryptedAttachmentsMap.get(mail.id)
            : transformFilename(mail.attachments);
        if (mail.children && mail.children.length > 0) {
          for (const item of mail.children) {
            item.attachments =
              item.encryption_type === PGPEncryptionType.PGP_MIME &&
              decryptedAttachmentsMap.has(item.id) &&
              decryptedAttachmentsMap.get(item.id).length > 0
                ? decryptedAttachmentsMap.get(item.id)
                : transformFilename(item.attachments);
          }
        }
      }
      return {
        ...state,
        mailDetail: action.payload,
        mailDetailLoaded: true,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.GET_MAIL_DETAIL_FAILURE: {
      return {
        ...state,
        mailDetailLoaded: true,
      };
    }

    case MailActionTypes.GET_MAIL_DETAIL: {
      return {
        ...state,
        mailDetail: null,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.CLEAR_MAILS_ON_CONVERSATION_MODE_CHANGE: {
      return {
        ...state,
        mails: [],
        total_mail_count: 0,
        mailDetail: null,
        loaded: false,
        unreadMailsCount: { inbox: 0 },
        noUnreadCountChange: true,
        canGetUnreadCount: true,
        mailMap: {},
        folderMap: new Map(),
      };
    }

    case MailActionTypes.CLEAR_MAILS_ON_LOGOUT: {
      return {
        mails: [],
        total_mail_count: 0,
        mailDetail: null,
        loaded: false,
        starredFolderCount: 0,
        decryptedContents: {},
        unreadMailsCount: { inbox: 0 },
        noUnreadCountChange: true,
        canGetUnreadCount: true,
        decryptedSubjects: {},
        customFolderMessageCount: [],
        mailMap: {},
        folderMap: new Map(),
      };
    }

    case MailActionTypes.CLEAR_MAIL_DETAIL: {
      return {
        ...state,
        mailDetail: null,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.UPDATE_MAIL_DETAIL_CHILDREN: {
      const { mailDetail } = state;
      if (mailDetail) {
        if (action.payload.last_action_data?.last_action) {
          if (mailDetail.id === action.payload.last_action_data.last_action_parent_id) {
            mailDetail.last_action = action.payload.last_action_data.last_action;
          } else {
            mailDetail.children = mailDetail.children.map(mail => {
              if (mail.id === action.payload.last_action_data.last_action_parent_id) {
                mail.last_action = action.payload.last_action_data.last_action;
              }
              return mail;
            });
          }
        }
        if (action.payload.parent === mailDetail.id) {
          mailDetail.children = mailDetail.children || [];
          mailDetail.children = mailDetail.children.filter(child => !(child.id === action.payload.id));
          mailDetail.children = [...mailDetail.children, action.payload];
          mailDetail.children_count = mailDetail.children.length;
        }
      }
      return { ...state, mailDetail, noUnreadCountChange: true };
    }

    case MailActionTypes.SET_CURRENT_FOLDER: {
      const { folderMap, mailMap, decryptedSubjects } = state;
      const mails = prepareMails(action.payload, folderMap, mailMap);
      const totalMailCount = folderMap.has(action.payload) ? folderMap.get(action.payload).total_mail_count : 0;
      for (const key of Object.keys(mailMap)) {
        const mail = mailMap[key];
        mail.marked = false;
        mailMap[key] = { ...mail };
      }
      for (const mail of mails) {
        if (decryptedSubjects[mail.id]) {
          mail.subject = decryptedSubjects[mail.id];
          mail.is_subject_encrypted = false;
        }
      }
      return {
        ...state,
        mails,
        mailMap,
        total_mail_count: totalMailCount,
        currentFolder: action.payload,
      };
    }

    case MailActionTypes.UPDATE_PGP_DECRYPTED_CONTENT: {
      if (action.payload.isDecryptingAllSubjects) {
        if (!action.payload.isPGPInProgress) {
          state.mails = state.mails.map(mail => {
            if (mail.id === action.payload.id) {
              mail.subject = action.payload.decryptedContent.subject;
              mail.is_subject_encrypted = false;
            }
            return mail;
          });
          state.decryptedSubjects[action.payload.id] = action.payload.decryptedContent.subject;
        }
        return { ...state };
      }
      const { decryptedContents } = state;
      let decryptedContent: SecureContent = decryptedContents[action.payload.id] || {};
      decryptedContent = {
        ...decryptedContent,
        id: action.payload.id,
        content: action.payload.decryptedContent.content,
        content_plain: action.payload.decryptedContent.content_plain,
        subject: action.payload.decryptedContent.subject,
        inProgress: action.payload.isPGPInProgress,
        incomingHeaders: action.payload.decryptedContent.incomingHeaders,
        decryptError: action.payload.decryptError,
      };
      decryptedContents[action.payload.id] = decryptedContent;
      return { ...state, decryptedContents, noUnreadCountChange: true };
    }

    case MailActionTypes.UPDATE_CURRENT_FOLDER: {
      let mailMap = { ...state.mailMap };
      const folderMap = new Map(state.folderMap);
      const newMail = { ...action.payload };
      // Update mail map
      mailMap = updateMailMap(mailMap, [newMail]);
      if (newMail.parent) {
        const mailIDs = Object.keys(mailMap);
        for (const mailID of mailIDs) {
          if (mailMap[mailID].id === newMail.parent && !newMail.isUpdate) {
            mailMap[mailID].has_children = true;
            mailMap[mailID].children_count += 1;
            if (mailMap[mailID].children_folder_info) {
              mailMap[mailID].children_folder_info = {
                ...mailMap[mailID].children_folder_info,
                non_trash_children_count: mailMap[mailID].children_folder_info.non_trash_children_count + 1,
              };
            } else {
              mailMap[mailID].children_folder_info = {
                trash_children_count: 0,
                non_trash_children_count: 1,
              };
            }
          }
        }
      }
      // update target folder map
      if (folderMap.has(newMail.folder) && folderMap.get(newMail.folder).mails?.length > 0) {
        const targetFolderMap = folderMap.get(newMail.folder);
        const basicFolderState = getUpdatesFolderMap([newMail], targetFolderMap, state.pageLimit);
        folderMap.set(newMail.folder, basicFolderState);
      }
      const mails = prepareMails(state.currentFolder, folderMap, mailMap);
      if (state.currentFolder) {
        const currentMailFolder = folderMap.get(state.currentFolder);
        state.total_mail_count = currentMailFolder ? currentMailFolder.total_mail_count : 0;
      }
      return {
        ...state,
        mails,
        mailMap,
        folderMap,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.EMPTY_FOLDER: {
      return { ...state, inProgress: true, noUnreadCountChange: true };
    }

    case MailActionTypes.EMPTY_FOLDER_SUCCESS: {
      if (state.folderMap.has(action.payload.folder)) {
        state.folderMap.delete(action.payload.folder);
      }
      return { ...state, mails: [], inProgress: false };
    }

    case MailActionTypes.EMPTY_FOLDER_FAILURE: {
      return { ...state, inProgress: false };
    }

    case MailActionTypes.MOVE_TAB: {
      return { ...state, currentSettingsTab: action.payload };
    }

    case MailActionTypes.EMPTY_ONLY_FOLDER: {
      if (state.folderMap.has(action.payload.folder)) {
        state.folderMap.delete(action.payload.folder);
      }
      return { ...state, inProgress: false };
    }

    case MailActionTypes.SET_ATTACHMENTS_FOR_PGP_MIME: {
      const { mailDetail, mailMap, decryptedAttachmentsMap } = state;
      const { attachments, messageID } = action.payload;
      if (mailDetail) {
        if (messageID === mailDetail.id) {
          mailDetail.attachments = attachments;
        } else if (mailDetail.children?.length > 0) {
          for (const child of mailDetail.children) {
            if (child.id === messageID) {
              child.attachments = attachments;
            }
          }
        }
      }
      for (const mailID of Object.keys(mailMap)) {
        if (mailID === messageID.toString()) {
          mailMap[mailID].attachments = attachments;
        }
      }
      decryptedAttachmentsMap.set(messageID, attachments);
      return { ...state, mailDetail, mailMap, decryptedAttachmentsMap };
    }

    default: {
      return state;
    }
  }
}
