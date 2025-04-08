import type { FC } from '../../../lib/teact/teact';
import React, { useEffect, useState, memo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiChat, ApiMessage } from '../../../api/types';
import { MAIN_THREAD_ID } from '../../../api/types';

import { selectChatMessages } from '../../../global/selectors';
import usePrevious from '../../../hooks/usePrevious';
import buildClassName from '../../../util/buildClassName';
import { isUserId, isChatGroup, isChatSuperGroup, isChatChannel } from '../../../global/helpers';

import styles from './MessageCounter.module.scss';

export type OwnProps = {
  chatId: string;
  isVisible: boolean;
};

type StateProps = {
  chat?: ApiChat;
  messages?: Record<number, ApiMessage>;
  currentUserId?: string;
};

const COUNT_ANIMATION_DELAY = 800;

const MessageCounter: FC<OwnProps & StateProps> = ({
  chatId,
  chat,
  isVisible,
  messages,
  currentUserId,
}) => {
  const { loadViewportMessages } = getActions();
  const [isCounting, setIsCounting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isHidden, setIsHidden] = useState(true);

  const wasVisible = usePrevious(isVisible);

  const shouldProcessChat = chat && (
    isUserId(chat.id) || isChatGroup(chat) || isChatSuperGroup(chat)
  ) && !isChatChannel(chat);

  useEffect(() => {
    if (isVisible && !wasVisible && shouldProcessChat && !isComplete) {
      setIsCounting(true);
      setIsHidden(false);
    }
  }, [isVisible, wasVisible, shouldProcessChat, isComplete]);

  useEffect(() => {
    if (!isCounting || !chat || !currentUserId) return;

    let isMounted = true;

    const countUserMessages = () => {
      if (!messages) return 0;

      if (chatId) {
        loadViewportMessages({
          chatId,
          threadId: MAIN_THREAD_ID,
        });
      }

      return Object.values(messages).filter((message: ApiMessage) =>
        message.senderId === currentUserId
      ).length;
    };

    const timer = setTimeout(() => {
      try {
        const count = countUserMessages();
        setMessageCount(count);
        setIsCounting(false);
        setIsComplete(true);
      } catch (error) {
        console.error('Error counting messages:', error);
        setIsCounting(false);
        setIsComplete(true);
      }
    }, COUNT_ANIMATION_DELAY);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isCounting, chat, messages, currentUserId, chatId, loadViewportMessages]);

  if (!shouldProcessChat || (!isCounting && !isComplete) || (!isCounting && !messageCount)) {
    return null;
  }

  const className = buildClassName(
    styles.messageCounter,
    isCounting && styles.isCounting,
    isComplete && styles.isComplete,
    isHidden && styles.hidden
  );

  return (
    <div className={className}>
      <span className={styles.counterText}>
        {isCounting ? 'Подсчет сообщений' : `${messageCount} сообщ.`}
      </span>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { chatId }): StateProps => {
    const chat = global.chats.byId[chatId];
    const messages = selectChatMessages(global, chatId);
    const currentUserId = global.currentUserId;

    return {
      chat,
      messages,
      currentUserId,
    };
  },
)(MessageCounter)); 