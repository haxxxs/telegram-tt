import type { FC } from '../../../lib/teact/teact';
import React, { useEffect, useState, memo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiChat, ApiMessage } from '../../../api/types';
import { MAIN_THREAD_ID } from '../../../api/types';

import { selectChatMessages } from '../../../global/selectors';
import usePrevious from '../../../hooks/usePrevious';
import buildClassName from '../../../util/buildClassName';
import { isUserId, isChatGroup, isChatSuperGroup, isOwnMessage, isChatChannel } from '../../../global/helpers';

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

const COUNTER_HIDE_DELAY = 3000;
const COUNT_ANIMATION_DELAY = 800;

const MessageCounter: FC<OwnProps & StateProps> = ({
  chatId,
  chat,
  isVisible,
  messages,
  currentUserId,
}) => {
  const [isCounting, setIsCounting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isHidden, setIsHidden] = useState(true);

  const wasVisible = usePrevious(isVisible);
  const isPrevComplete = usePrevious(isComplete);

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
    if (isComplete && !isPrevComplete) {
      const timeout = setTimeout(() => {
        setIsHidden(true);
      }, COUNTER_HIDE_DELAY);

      return () => clearTimeout(timeout);
    }
  }, [isComplete, isPrevComplete]);

  useEffect(() => {
    if (!isCounting || !messages || !currentUserId) return;

    const timer = setTimeout(() => {
      const count = Object.values(messages).filter((message) => (
        message.senderId === currentUserId
      )).length;

      setMessageCount(count);
      setIsCounting(false);
      setIsComplete(true);
    }, COUNT_ANIMATION_DELAY);

    return () => clearTimeout(timer);
  }, [isCounting, messages, currentUserId]);

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