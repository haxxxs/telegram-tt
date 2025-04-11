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

// TODO: Можно вынести в отдельный файл type.ts.
export type OwnProps = {
  chatId: string;
  isVisible: boolean;
};

type StateProps = {
  chat?: ApiChat;
  messages?: Record<number, ApiMessage>;
  currentUserId?: string;
};

// Глобальная очередь чатов
const globalChatQueue: string[] = [];
let isProcessingGlobalQueue = false;

// TODO: Константы можно вынести в constants.ts.
const REQUEST_DELAY = 2000; // Увеличиваем задержку между запросами
const MAX_REQUESTS_PER_CHAT = 5;

// TODO: Стейты и функции подсчета можно вынести в отельные файлы/хуки.

const MessageCounter: FC<OwnProps & StateProps> = ({
  chatId,
  chat,
  isVisible,
  currentUserId,
}) => {
  const { loadViewportMessages } = getActions();
  const [isCounting, setIsCounting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isHidden, setIsHidden] = useState(true);

  const processedMessageIds = useRef<Set<number>>(new Set<number>());
  const isReachedStart = useRef<boolean>(false);
  const requestCount = useRef<number>(0);
  const lastRequestTime = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);

  const wasVisible = usePrevious(isVisible);

  const shouldProcessChat = chat && (
    isUserId(chat.id) || isChatGroup(chat) || isChatSuperGroup(chat)
  ) && !isChatChannel(chat);

  const processChat = async () => {
    if (!chatId || !isVisible || !shouldProcessChat || isComplete) return;

    if (!globalChatQueue.includes(chatId)) {
      globalChatQueue.push(chatId);
    }

    if (isProcessingGlobalQueue && globalChatQueue[0] !== chatId) {
      return;
    }

    isProcessingGlobalQueue = true;
    setIsCounting(true);
    setIsHidden(false);
    setIsComplete(false);

    const loadMessages = async () => {
      if (!isMounted || isReachedStart.current || requestCount.current >= MAX_REQUESTS_PER_CHAT) {
        if (globalChatQueue[0] === chatId) {
          globalChatQueue.shift();
          isProcessingGlobalQueue = false;
          setIsCounting(false);
          setIsComplete(true);
        }
        return;
      }

      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime.current;
      const delay = Math.max(0, REQUEST_DELAY - timeSinceLastRequest);

      if (delay > 0) {
        setTimeout(loadMessages, delay);
        return;
      }

      isProcessing.current = true;
      lastRequestTime.current = Date.now();

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
                if (globalChatQueue[0] === chatId) {
                  globalChatQueue.shift();
                  isProcessingGlobalQueue = false;
                }
              }

              requestCount.current++;
              resolve();
            },
          });
        });
      } catch (error) {
        console.error(error);
        isReachedStart.current = true;
        setIsCounting(false);
        setIsComplete(true);
        if (globalChatQueue[0] === chatId) {
          globalChatQueue.shift();
          isProcessingGlobalQueue = false;
        }
      } finally {
        isProcessing.current = false;
        if (!isReachedStart.current && requestCount.current < MAX_REQUESTS_PER_CHAT) {
          setTimeout(loadMessages, REQUEST_DELAY);
        }
      }
    };

    let isMounted = true;
    loadMessages();

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    if (isVisible && !wasVisible && shouldProcessChat && !isComplete) {
      setMessageCount(0);
      processedMessageIds.current.clear();
      isReachedStart.current = false;
      requestCount.current = 0;
      processChat();
    }
  }, [isVisible, wasVisible, shouldProcessChat, isComplete]);

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