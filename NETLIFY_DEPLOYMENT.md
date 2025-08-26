# 🚀 Развертывание MyMessenger на Netlify

## 📋 Требования

- GitHub репозиторий с проектом
- Аккаунт на [netlify.com](https://netlify.com)

## 🎯 Пошаговое развертывание

### Шаг 1: Подготовка проекта

Убедитесь, что у вас есть все необходимые файлы:
- ✅ `netlify.toml` - конфигурация Netlify
- ✅ `public/_redirects` - правила перенаправления
- ✅ `next.config.ts` - настроен для статического экспорта

### Шаг 2: Создание сайта на Netlify

1. **Зайдите на [netlify.com](https://netlify.com)**
2. **Нажмите "New site from Git"**
3. **Выберите GitHub** и авторизуйтесь
4. **Выберите репозиторий** `my-messenger`

### Шаг 3: Настройка сборки

**Build settings:**
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: `18` (автоматически из netlify.toml)

**Environment variables:**
```
NEXT_PUBLIC_API_URL=https://your-api-url.onrender.com
```

### Шаг 4: Развертывание

1. **Нажмите "Deploy site"**
2. **Дождитесь завершения сборки** (обычно 2-5 минут)
3. **Сайт будет доступен** по адресу типа: `https://random-name.netlify.app`

## 🔧 Настройка домена

### Автоматический домен
- Netlify автоматически генерирует домен
- Можно изменить в настройках сайта

### Кастомный домен
1. **В настройках сайта** → **Domain management**
2. **Добавьте свой домен**
3. **Настройте DNS записи** на вашем регистраторе

## 🚨 Решение проблем

### Ошибка 404
**Причина**: Неправильная конфигурация для SPA
**Решение**: Убедитесь, что файл `public/_redirects` содержит:
```
/*    /index.html   200
```

### Ошибка сборки
**Причина**: Проблемы с зависимостями
**Решение**: 
1. Проверьте версию Node.js (должна быть 18+)
2. Убедитесь, что все зависимости установлены

### Проблемы с API
**Причина**: CORS или неправильный URL API
**Решение**:
1. Проверьте переменную `NEXT_PUBLIC_API_URL`
2. Убедитесь, что API сервер запущен и доступен

## 📱 Настройка PWA

### 1. Создайте manifest.json
```json
{
  "name": "MyMessenger",
  "short_name": "Messenger",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### 2. Добавьте в layout.tsx
```tsx
<link rel="manifest" href="/manifest.json" />
```

## 🔒 Безопасность

### HTTPS
- Netlify автоматически предоставляет SSL
- Все запросы перенаправляются на HTTPS

### Заголовки безопасности
Уже настроены в `netlify.toml`:
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy

## 📊 Мониторинг

### Аналитика
- Netlify Analytics (платно)
- Google Analytics (бесплатно)

### Логи
- Build logs доступны в панели управления
- Function logs для serverless функций

## 🚀 Автодеплой

### Настройка
1. **В настройках сайта** → **Build & deploy**
2. **Включите "Auto publish"**
3. **Настройте branch** (обычно `main` или `master`)

### Триггеры
- **Push в main branch** → автоматический деплой
- **Pull Request** → preview деплой
- **Manual deploy** → ручной деплой

## 💰 Стоимость

### Бесплатный план
- **100GB трафика** в месяц
- **300 build minutes** в месяц
- **Безлимитные сайты**
- **SSL сертификаты**

### Платные планы
- **Pro**: $19/месяц
- **Business**: $99/месяц

## 🎯 Рекомендации

1. **Используйте бесплатный план** для начала
2. **Настройте автодеплой** для удобства
3. **Добавьте кастомный домен** для профессионализма
4. **Настройте PWA** для мобильного опыта

## 📞 Поддержка

- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Community**: [community.netlify.com](https://community.netlify.com)
- **GitHub Issues**: создайте issue в репозитории

---

**Удачи с развертыванием на Netlify! 🚀**
