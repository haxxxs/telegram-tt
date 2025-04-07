# Тестовое задание Telegram Web A

## Задание

Подсчет моих сообщений в чатах типа группа и личный чат.
Подсчет запускается когда объект чата попадает в область видимости.
При начале подсчета выводим плашку с надписью "Подсчет сообщений". При окончании - число сообщений.
Плашка меняет свою ширину плавно.

## Решение

Решение состоит из следующих файлов:

1. **MessageCounter.tsx** - Компонент React, реализующий логику подсчета сообщений
2. **MessageCounter.module.scss** - Стили для компонента с анимациями
3. **demo.html** - Демонстрационный файл, показывающий работу компонента

### Интеграция компонента

Компонент MessageCounter был интегрирован в компонент `Chat.tsx` из Telegram Web A. Вот как это сделано:

1. Импорт компонента в Chat.tsx:

```typescript
import MessageCounter from "./MessageCounter";
```

2. Добавление компонента внутри ListItem перед закрывающим тегом:

```tsx
<MessageCounter chatId={chatId} isVisible={isIntersecting} />
```

### Логика работы

1. Компонент проверяет, что чат является личным или группой, но не каналом
2. Когда чат появляется в области видимости, начинается подсчет сообщений
3. Плашка с текстом "Подсчет сообщений" плавно появляется и анимируется
4. После подсчета отображается количество сообщений текущего пользователя
5. Через некоторое время плашка плавно исчезает

### Основной код компонента:

```tsx
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

  const shouldProcessChat =
    chat &&
    (isUserId(chat.id) || isChatGroup(chat) || isChatSuperGroup(chat)) &&
    !isChatChannel(chat);

  useEffect(() => {
    if (isVisible && !wasVisible && shouldProcessChat && !isComplete) {
      setIsCounting(true);
      setIsHidden(false);
    }
  }, [isVisible, wasVisible, shouldProcessChat, isComplete]);

  useEffect(() => {
    if (!isCounting || !messages || !currentUserId) return;

    const timer = setTimeout(() => {
      const count = Object.values(messages).filter(
        (message) => message.senderId === currentUserId
      ).length;

      setMessageCount(count);
      setIsCounting(false);
      setIsComplete(true);
    }, COUNT_ANIMATION_DELAY);

    return () => clearTimeout(timer);
  }, [isCounting, messages, currentUserId]);
};
```

## Демонстрация

Из-за сложностей с развертвыванием проекта под окружение Telegram, был создан файл demo.html, который показывает, как работает компонент. Вы можете открыть его в любом браузере и увидеть анимацию подсчета сообщений.
