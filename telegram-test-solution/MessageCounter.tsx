import type { FC } from '../../../lib/teact/teact';
import React, { useEffect, useState, memo, useRef } from '../../../lib/teact/teact';
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
  const processedMessageIds = useRef<Set<number>>(new Set<number>());
  const isReachedStart = useRef<boolean>(false);

  const wasVisible = usePrevious(isVisible);

  const shouldProcessChat = chat && (
    isUserId(chat.id) || isChatGroup(chat) || isChatSuperGroup(chat)
  ) && !isChatChannel(chat);

  useEffect(() => {
    if (isVisible && !wasVisible && shouldProcessChat && !isComplete) {
      setIsCounting(true);
      setIsHidden(false);
      setMessageCount(0);
      processedMessageIds.current.clear();
      isReachedStart.current = false;
    }
  }, [isVisible, wasVisible, shouldProcessChat, isComplete]);

  useEffect(() => {
    if (!isCounting || !chat || !currentUserId) return;

    let isMounted = true;

    const loadMessages = async () => {
      if (!chatId || isReachedStart.current) return;

      try {
        await new Promise<void>((resolve) => {
          loadViewportMessages({
            chatId,
            threadId: MAIN_THREAD_ID,
            direction: LoadMoreDirection.Backwards,
            onLoaded: () => {
              if (!isMounted) {
                resolve();
                return;
              }

              const global = getGlobal();
              const newMessages = selectChatMessages(global, chatId);

              if (!newMessages) {
                resolve();
                return;
              }

              let newCount = 0;
              let hasNewMessages = false;

              Object.values(newMessages).forEach((message) => {
                if (
                  !processedMessageIds.current.has(message.id) &&
                  message.senderId === currentUserId
                ) {
                  processedMessageIds.current.add(message.id);
                  newCount++;
                  hasNewMessages = true;
                }
              });

              if (hasNewMessages) {
                setMessageCount((prev) => prev + newCount);
              }

              const messageIds = Object.keys(newMessages).map(Number);
              if (messageIds.length === 0 || Math.min(...messageIds) === 1) {
                isReachedStart.current = true;
                setIsCounting(false);
                setIsComplete(true);
              }

              resolve();
            },
          });
        });

        if (!isReachedStart.current) {
          setTimeout(loadMessages, COUNT_ANIMATION_DELAY);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setIsCounting(false);
          setIsComplete(true);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [isCounting, chat, currentUserId, chatId, loadViewportMessages]);

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