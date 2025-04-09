import type { FC } from '../../../lib/teact/teact';
import React, { useEffect, useState, memo } from '../../../lib/teact/teact';
import { getActions, withGlobal, getGlobal } from '../../../global';

import type { ApiChat, ApiMessage } from '../../../api/types';
import { MAIN_THREAD_ID } from '../../../api/types';
import { LoadMoreDirection } from '../../../types';

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
  const [hasMore, setHasMore] = useState(true);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<number>>(new Set());

  const wasVisible = usePrevious(isVisible);

  const shouldProcessChat = chat && (
    isUserId(chat.id) || isChatGroup(chat) || isChatSuperGroup(chat)
  ) && !isChatChannel(chat);

  useEffect(() => {
    if (isVisible && !wasVisible && shouldProcessChat && !isComplete) {
      setIsCounting(true);
      setIsHidden(false);
      setMessageCount(0);
      setHasMore(true);
      setProcessedMessageIds(new Set());
    }
  }, [isVisible, wasVisible, shouldProcessChat, isComplete]);

  useEffect(() => {
    if (!isCounting || !chat || !currentUserId) return;

    let isMounted = true;

    const loadMessages = async () => {
      if (!chatId || !hasMore) return;

      try {
        await loadViewportMessages({
          chatId,
          threadId: MAIN_THREAD_ID,
          direction: LoadMoreDirection.Backwards,
        });

        if (isMounted) {
          const global = getGlobal();
          const newMessages = selectChatMessages(global, chatId);

          const newMessageIds = Object.keys(newMessages || {})
            .map(Number)
            .filter(id => !processedMessageIds.has(id));

          const newMessageCount = newMessageIds
            .map(id => newMessages![id])
            .filter((message: ApiMessage) => message.senderId === currentUserId)
            .length;

          setProcessedMessageIds(prev => {
            const newSet = new Set(prev);
            newMessageIds.forEach(id => newSet.add(id));
            return newSet;
          });

          setMessageCount(prevCount => prevCount + newMessageCount);

          const messageIds = Object.keys(newMessages || {}).map(Number);
          if (messageIds.length === 0 || Math.min(...messageIds) === 1) {
            setHasMore(false);
            setIsCounting(false);
            setIsComplete(true);
          }
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setIsCounting(false);
          setIsComplete(true);
        }
      }
    };

    const timer = setTimeout(() => {
      loadMessages();
    }, COUNT_ANIMATION_DELAY);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isCounting, chat, messages, currentUserId, chatId, loadViewportMessages, hasMore, processedMessageIds]);

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