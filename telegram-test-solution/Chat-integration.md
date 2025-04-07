# Интеграция компонента MessageCounter в Chat.tsx

Чтобы интегрировать компонент подсчета сообщений в существующий код Telegram Web A, нужно внести следующие изменения в файл `src/components/left/main/Chat.tsx`:

## 1. Добавление импорта

```tsx
import type { FC } from "../../../lib/teact/teact";
import React, { memo, useEffect, useMemo } from "../../../lib/teact/teact";
import { getActions, withGlobal } from "../../../global";

// ... существующие импорты ...

import ChatBadge from "./ChatBadge";
import ChatCallStatus from "./ChatCallStatus";
import MessageCounter from "./MessageCounter";

import "./Chat.scss";

// ... остальная часть файла ...
```

## 2. Использование компонента useIsIntersecting

```tsx
const { renderSubtitle, ref } = useChatListEntry({
  chat,
  chatId,
  lastMessage,
  typingStatus,
  draft,
  statefulMediaContent: groupStatefulContent({ story: lastMessageStory }),
  lastMessageTopic,
  lastMessageSender,
  observeIntersection,
  animationType,
  withInterfaceAnimations,
  orderDiff,
  isSavedDialog,
  isPreview,
  topics,
});

const isIntersecting = useIsIntersecting(ref, observeIntersection);
```

## 3. Добавление компонента MessageCounter

```tsx
      {shouldRenderChatFolderModal && (
        <ChatFolderModal
          isOpen={isChatFolderModalOpen}
          onClose={closeChatFolderModal}
          onCloseAnimationEnd={unmarkRenderChatFolderModal}
          chatId={chatId}
        />
      )}
      <MessageCounter chatId={chatId} isVisible={isIntersecting} />
    </ListItem>
```

## Результат

После внесения этих изменений, компонент MessageCounter будет отображаться в каждом элементе чата и подсчитывать количество сообщений, когда чат появляется в области видимости.

Компонент будет:

1. Отслеживать, когда чат становится видимым
2. Показывать плашку "Подсчет сообщений" с анимацией
3. После задержки отображать количество сообщений
4. Автоматически скрываться через некоторое время
