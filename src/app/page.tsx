"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { io, Socket } from "socket.io-client"
import { v4 as uuidv4 } from "uuid"
import {
  Send,
  MoreVertical,
  Phone,
  Video,
  Settings,
  User,
  Bell,
  Palette,
  LogOut,
  X,
  Search,
  Plus,
  Archive,
  Trash2,
  Smile,
  Paperclip,
  ImageIcon,
  File,
  BellRing,
  Volume2,
  VolumeX,
  Circle,
} from "lucide-react"

type Message = {
  id: string
  from: string
  to: string
  text: string
  time: string
  type?: "text" | "image" | "file"
  fileName?: string
  fileSize?: string
  reactions?: { emoji: string; count: number; users: string[] }[]
}

type Chat = {
  id: string
  name: string
  avatar: string
  messages: Message[]
  unread: number
  online?: boolean
  lastSeen?: string
  status?: "online" | "away" | "busy" | "offline"
}

type Notification = {
  id: string
  type: "message" | "call" | "system"
  title: string
  message: string
  time: string
  read: boolean
  chatId?: string
}

type UserData = {
  id: string
  name: string
  avatar: string
  status: "online" | "away" | "busy" | "offline"
  lastSeen: string
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [archivedChats, setArchivedChats] = useState<Chat[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [newChatName, setNewChatName] = useState("")
  const [newChatAvatar, setNewChatAvatar] = useState("👤")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showCall, setShowCall] = useState(false)
  const [callType, setCallType] = useState<"audio" | "video">("audio")
  const [isInCall, setIsInCall] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null)
  const [searchInMessages, setSearchInMessages] = useState("")
  const [showMessageSearch, setShowMessageSearch] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "message",
      title: "Новое сообщение от Димы",
      message: "Привет! Как дела?",
      time: "5 мин назад",
      read: false,
      chatId: "dima",
    },
    {
      id: "2",
      type: "call",
      title: "Пропущенный звонок",
      message: "Аня пыталась дозвониться",
      time: "15 мин назад",
      read: false,
      chatId: "anya",
    },
    {
      id: "3",
      type: "system",
      title: "Обновление приложения",
      message: "Доступна новая версия MyMessenger",
      time: "1 час назад",
      read: true,
    },
  ])

  const [userProfile, setUserProfile] = useState({
    name: "Вы",
    avatar: "😊",
    status: "online" as "online" | "away" | "busy" | "offline",
    customStatus: "",
    bio: "Люблю программировать и общаться",
  })

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentChat = chats.find((c) => c.id === activeChat) || chats[0]
  const filteredChats = chats.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const unreadNotifications = notifications.filter((n) => !n.read).length

  const emojis = ["😀", "😂", "😍", "🤔", "😢", "😡", "👍", "👎", "❤️", "🔥", "💯", "🎉"]
  const reactionEmojis = ["❤️", "👍", "😂", "😮", "😢", "😡"]

  const statusOptions = [
    { value: "online", label: "В сети", color: "bg-green-500", icon: Circle },
    { value: "away", label: "Отошел", color: "bg-yellow-500", icon: Circle },
    { value: "busy", label: "Занят", color: "bg-red-500", icon: Circle },
    { value: "offline", label: "Не в сети", color: "bg-gray-500", icon: Circle },
  ]

  // Инициализация Socket.IO
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const newSocket = io(apiUrl)
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log("Подключен к серверу")
      setIsConnected(true)
      
      // Регистрируем пользователя
      newSocket.emit("register", {
        name: userProfile.name,
        avatar: userProfile.avatar
      })
    })

    newSocket.on("disconnect", () => {
      console.log("Отключен от сервера")
      setIsConnected(false)
    })

    newSocket.on("registered", (userData: UserData) => {
      setCurrentUser(userData)
      console.log("Зарегистрирован как:", userData)
    })

    newSocket.on("userList", (userList: UserData[]) => {
      setUsers(userList)
      // Создаем чаты для всех пользователей
      const newChats = userList
        .filter(user => user.id !== currentUser?.id)
        .map(user => ({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          messages: [],
          unread: 0,
          online: user.status === "online",
          status: user.status,
          lastSeen: user.lastSeen
        }))
      setChats(newChats)
    })

    newSocket.on("newMessage", (message: Message) => {
      console.log("Новое сообщение:", message)
      
      setChats(prev => prev.map(chat => {
        if (chat.id === message.from || chat.id === message.to) {
          return {
            ...chat,
            messages: [...chat.messages, message],
            unread: chat.id === message.from ? chat.unread + 1 : chat.unread
          }
        }
        return chat
      }))
    })

    newSocket.on("userStatusChanged", ({ userId, status, lastSeen }) => {
      setChats(prev => prev.map(chat => {
        if (chat.id === userId) {
          return {
            ...chat,
            status,
            lastSeen,
            online: status === "online"
          }
        }
        return chat
      }))
    })

    newSocket.on("userTyping", ({ userId, isTyping }) => {
      if (activeChat === userId) {
        setTyping(isTyping)
      }
    })

    return () => {
      newSocket.close()
    }
  }, [userProfile.name, userProfile.avatar])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (callTimer) {
        clearInterval(callTimer)
      }
    }
  }, [callTimer])

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "busy":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "online":
        return "В сети"
      case "away":
        return "Отошел"
      case "busy":
        return "Занят"
      default:
        return "Не в сети"
    }
  }

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const changeUserStatus = (newStatus: "online" | "away" | "busy" | "offline") => {
    setUserProfile((prev) => ({ ...prev, status: newStatus }))
    setShowStatusPicker(false)
    
    // Отправляем статус на сервер
    if (socket) {
      socket.emit("updateStatus", newStatus)
    }
  }

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleFileAttach = (type: "image" | "file") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "image" ? "image/*" : "*"
      fileInputRef.current.click()
    }
    setShowAttachMenu(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith("image/")
    const fileSize = (file.size / 1024 / 1024).toFixed(1) + " MB"

    // Отправляем файл через Socket.IO
    if (socket && activeChat) {
      socket.emit("sendMessage", {
        to: activeChat,
        text: isImage ? "Изображение" : file.name,
        type: isImage ? "image" : "file"
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const addReaction = (messageIndex: number, emoji: string) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== activeChat) return chat

        const updatedMessages = [...chat.messages]
        const message = updatedMessages[messageIndex]

        if (!message.reactions) {
          message.reactions = []
        }

        const existingReaction = message.reactions.find((r) => r.emoji === emoji)
        if (existingReaction) {
          if (existingReaction.users.includes("me")) {
            existingReaction.count--
            existingReaction.users = existingReaction.users.filter((u) => u !== "me")
            if (existingReaction.count === 0) {
              message.reactions = message.reactions.filter((r) => r.emoji !== emoji)
            }
          } else {
            existingReaction.count++
            existingReaction.users.push("me")
          }
        } else {
          message.reactions.push({ emoji, count: 1, users: ["me"] })
        }

        return { ...chat, messages: updatedMessages }
      }),
    )
    setShowReactionPicker(null)
  }

  const createNewChat = () => {
    if (!newChatName.trim()) return

    const newChat: Chat = {
      id: Date.now().toString(),
      name: newChatName,
      avatar: newChatAvatar,
      messages: [],
      unread: 0,
      online: Math.random() > 0.5,
      status: Math.random() > 0.5 ? "online" : "away",
    }

    setChats((prev) => [...prev, newChat])
    setNewChatName("")
    setNewChatAvatar("👤")
    setShowNewChat(false)
    setActiveChat(newChat.id)
  }

  const archiveChat = (chatId: string) => {
    const chatToArchive = chats.find((c) => c.id === chatId)
    if (chatToArchive) {
      setArchivedChats((prev) => [...prev, chatToArchive])
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      if (activeChat === chatId && chats.length > 1) {
        setActiveChat(chats.find((c) => c.id !== chatId)!.id)
      }
    }
    setShowChatMenu(null)
  }

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    if (activeChat === chatId && chats.length > 1) {
      setActiveChat(chats.find((c) => c.id !== chatId)!.id)
    }
    setShowChatMenu(null)
  }

  const restoreChat = (chatId: string) => {
    const chatToRestore = archivedChats.find((c) => c.id === chatId)
    if (chatToRestore) {
      setChats((prev) => [...prev, chatToRestore])
      setArchivedChats((prev) => prev.filter((c) => c.id !== chatId))
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chats])

  const sendMessage = () => {
    if (!input.trim() || !activeChat || !socket) return
    
    const newMessage: Message = {
      id: uuidv4(),
      from: currentUser?.id || "",
      to: activeChat,
      text: input,
      time: new Date().toISOString()
    }

    // Отправляем сообщение через Socket.IO
    socket.emit("sendMessage", {
      to: activeChat,
      text: input,
      type: "text"
    })

    setInput("")
  }

  const startCall = (type: "audio" | "video") => {
    setCallType(type)
    setShowCall(true)
    setIsInCall(true)
    setCallDuration(0)
    
    // Запускаем таймер звонка
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
    setCallTimer(timer)
  }

  const endCall = () => {
    setShowCall(false)
    setIsInCall(false)
    if (callTimer) {
      clearInterval(callTimer)
      setCallTimer(null)
    }
    setCallDuration(0)
  }

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Показываем индикатор подключения
  if (!isConnected) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">Подключение к серверу...</h2>
          <p className="text-gray-400">Проверьте, что API сервер запущен на порту 3001</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex h-screen bg-black">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

      <aside className="w-80 bg-black/90 backdrop-blur-xl border-r border-gray-800/50 flex flex-col shadow-2xl">
        <header className="p-6 border-b border-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-gray-300 text-lg">💬</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-100">MyMessenger</h1>
                <p className="text-sm text-gray-400">{chats.length} активных чата</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-2 hover:bg-gray-800/70 rounded-xl transition-colors relative"
                >
                  <Bell size={18} className="text-gray-300" />
                  {unreadNotifications > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">{unreadNotifications}</span>
                    </div>
                  )}
                </button>
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="p-2 hover:bg-gray-800/70 rounded-xl transition-colors"
              >
                <User size={18} className="text-gray-300" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-800/70 rounded-xl transition-colors"
              >
                <Settings size={18} className="text-gray-300" />
              </button>
            </div>
          </div>

          <div className="mt-4 mb-4">
            <div className="relative">
              <button
                onClick={() => setShowStatusPicker(!showStatusPicker)}
                className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded-xl transition-colors w-full"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gray-800/90 rounded-full flex items-center justify-center text-lg">
                    {userProfile.avatar}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(userProfile.status)} rounded-full border-2 border-black`}
                  ></div>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-200">{userProfile.name}</p>
                  <p className="text-xs text-gray-400">{getStatusLabel(userProfile.status)}</p>
                </div>
              </button>

              <AnimatePresence>
                {showStatusPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-full bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-10"
                  >
                    {statusOptions.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => changeUserStatus(status.value as "online" | "away" | "busy" | "offline")}
                        className={`w-full p-3 text-left hover:bg-gray-700/70 transition-colors flex items-center gap-3 text-gray-300 text-sm first:rounded-t-xl last:rounded-b-xl ${
                          userProfile.status === status.value ? "bg-gray-700/50" : ""
                        }`}
                      >
                        <div className={`w-3 h-3 ${status.color} rounded-full`}></div>
                        {status.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/70 text-gray-200 border border-gray-800/50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600/50 placeholder-gray-500"
            />
          </div>
        </header>

        <nav className="flex-1 overflow-y-auto p-2">
          <div className="p-2 mb-2 space-y-2">
            <button
              onClick={() => setShowNewChat(true)}
              className="w-full p-3 bg-gray-800/70 hover:bg-gray-700/70 rounded-xl transition-colors flex items-center gap-3 text-gray-300"
            >
              <Plus size={18} />
              <span className="text-sm">Новый чат</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex-1 p-2 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                  showArchived ? "bg-gray-700/70 text-gray-200" : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
                }`}
              >
                <Archive size={14} />
                <span>Архив ({archivedChats.length})</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {(showArchived ? archivedChats : filteredChats).map((chat) => (
              <motion.div
                key={chat.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 cursor-pointer rounded-2xl transition-all duration-200 relative group ${
                  activeChat === chat.id && !showArchived
                    ? "bg-gray-700/80 text-gray-100 shadow-lg"
                    : "hover:bg-gray-900/70 text-gray-300"
                }`}
              >
                <div
                  onClick={() => {
                    if (showArchived) {
                      restoreChat(chat.id)
                    } else {
                      setActiveChat(chat.id)
                    }
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-800/90 rounded-full flex items-center justify-center text-xl shadow-md border border-gray-700/50">
                        {chat.avatar}
                      </div>
                      {!showArchived && (
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(chat.status)} border-2 border-black rounded-full shadow-sm`}
                        ></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{chat.name}</h3>
                      <p
                        className={`text-xs ${
                          activeChat === chat.id && !showArchived ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {showArchived
                          ? "Архивировано"
                          : chat.status === "online"
                            ? "В сети"
                            : chat.lastSeen || getStatusLabel(chat.status)}
                      </p>
                    </div>
                  </div>
                  {!showArchived && chat.unread > 0 && (
                    <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center shadow-sm">
                      {chat.unread}
                    </div>
                  )}
                </div>

                {!showArchived && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowChatMenu(showChatMenu === chat.id ? null : chat.id)
                    }}
                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-800/70 rounded-lg transition-all"
                  >
                    <MoreVertical size={14} className="text-gray-400" />
                  </button>
                )}

                <AnimatePresence>
                  {showChatMenu === chat.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-8 right-2 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-10 min-w-[160px]"
                    >
                      <button
                        onClick={() => archiveChat(chat.id)}
                        className="w-full p-3 text-left hover:bg-gray-700/70 rounded-t-xl transition-colors flex items-center gap-3 text-gray-300 text-sm"
                      >
                        <Archive size={16} />
                        Архивировать
                      </button>
                      <button
                        onClick={() => deleteChat(chat.id)}
                        className="w-full p-3 text-left hover:bg-red-900/30 rounded-b-xl transition-colors flex items-center gap-3 text-red-400 text-sm"
                      >
                        <Trash2 size={16} />
                        Удалить
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            {filteredChats.length === 0 && searchQuery && !showArchived && (
              <div className="text-center py-8 text-gray-500">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Чаты не найдены</p>
              </div>
            )}
          </div>
        </nav>
      </aside>

      <section className="flex-1 flex flex-col bg-black/95 backdrop-blur-sm">
        <header className="p-6 border-b border-gray-800/30 bg-black/90 backdrop-blur-xl">
          {showMessageSearch && (
            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Поиск по сообщениям..."
                  value={searchInMessages}
                  onChange={(e) => setSearchInMessages(e.target.value)}
                  className="w-full bg-gray-900/70 text-gray-200 border border-gray-800/50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600/50 placeholder-gray-500"
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gray-800/90 rounded-full flex items-center justify-center text-xl shadow-md border border-gray-700/50">
                  {currentChat?.avatar || "👤"}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(currentChat?.status)} border-2 border-black rounded-full`}
                ></div>
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-100">{currentChat?.name || "Выберите чат"}</h2>
                <p className="text-sm text-gray-400">
                  {currentChat?.status === "online"
                    ? "В сети"
                    : currentChat?.lastSeen ? new Date(currentChat.lastSeen).toLocaleString() : getStatusLabel(currentChat?.status)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowMessageSearch(!showMessageSearch)}
                className="p-2 hover:bg-gray-900/70 rounded-xl transition-colors"
                title="Поиск по сообщениям"
              >
                <Search size={20} className="text-gray-300" />
              </button>
              <button 
                onClick={() => startCall("audio")}
                className="p-2 hover:bg-gray-900/70 rounded-xl transition-colors"
                title="Аудиозвонок"
              >
                <Phone size={20} className="text-gray-300" />
              </button>
              <button 
                onClick={() => startCall("video")}
                className="p-2 hover:bg-gray-900/70 rounded-xl transition-colors"
                title="Видеозвонок"
              >
                <Video size={20} className="text-gray-300" />
              </button>
              <button className="p-2 hover:bg-gray-900/70 rounded-xl transition-colors">
                <MoreVertical size={20} className="text-gray-300" />
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {currentChat?.messages
            .filter(msg => 
              !searchInMessages || 
              msg.text.toLowerCase().includes(searchInMessages.toLowerCase())
            )
            .map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className={`flex ${msg.from === currentUser?.id ? "justify-end" : "justify-start"}`}
              >
              <div className="relative group">
                <div
                  className={`px-6 py-3 rounded-3xl shadow-sm max-w-xs relative ${
                    msg.from === currentUser?.id
                      ? "bg-gray-700/90 text-gray-100 shadow-lg"
                      : "bg-gray-900/80 backdrop-blur-sm text-gray-200 border border-gray-800/50"
                  }`}
                >
                  {msg.type === "file" && (
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gray-600/50 rounded-lg flex items-center justify-center">
                        <File size={20} className="text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{msg.fileName}</p>
                        <p className="text-xs text-gray-400">{msg.fileSize}</p>
                      </div>
                    </div>
                  )}

                  {msg.type === "image" && (
                    <div className="mb-2">
                      <div className="w-48 h-32 bg-gray-600/50 rounded-lg flex items-center justify-center">
                        <ImageIcon size={32} className="text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{msg.fileName}</p>
                    </div>
                  )}

                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <span
                    className={`absolute -bottom-5 text-[10px] ${
                      msg.from === currentUser?.id ? "right-2 text-gray-400" : "left-2 text-gray-500"
                    }`}
                  >
                    {new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {msg.reactions.map((reaction, idx) => (
                        <button
                          key={idx}
                          onClick={() => addReaction(i, reaction.emoji)}
                          className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                            reaction.users.includes("me")
                              ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                              : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
                          }`}
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowReactionPicker(showReactionPicker === i ? null : i)}
                  className="absolute -right-8 top-1/2 transform -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-800/70 rounded-lg transition-all"
                >
                  <Smile size={16} className="text-gray-400" />
                </button>

                <AnimatePresence>
                  {showReactionPicker === i && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-0 right-0 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-10 p-2"
                    >
                      <div className="flex gap-1">
                        {reactionEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(i, emoji)}
                            className="w-8 h-8 hover:bg-gray-700/50 rounded-lg flex items-center justify-center transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}

          {typing && activeChat && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 px-6 py-3 rounded-3xl shadow-sm">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">{currentChat?.name} печатает...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <footer className="p-6 border-t border-gray-800/30 bg-black/90 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-3 hover:bg-gray-800/70 rounded-xl transition-colors"
              >
                <Paperclip size={20} className="text-gray-300" />
              </button>

              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-10 min-w-[160px]"
                  >
                    <button
                      onClick={() => handleFileAttach("image")}
                      className="w-full p-3 text-left hover:bg-gray-700/70 rounded-t-xl transition-colors flex items-center gap-3 text-gray-300 text-sm"
                    >
                      <ImageIcon size={16} />
                      Изображение
                    </button>
                    <button
                      onClick={() => handleFileAttach("file")}
                      className="w-full p-3 text-left hover:bg-gray-700/70 rounded-b-xl transition-colors flex items-center gap-3 text-gray-300 text-sm"
                    >
                      <File size={16} />
                      Файл
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Введите сообщение..."
                className="w-full bg-gray-900/70 backdrop-blur-sm text-gray-200 border border-gray-800/50 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-gray-600/50 focus:border-gray-700 placeholder-gray-500 transition-all"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3 hover:bg-gray-800/70 rounded-xl transition-colors"
              >
                <Smile size={20} className="text-gray-300" />
              </button>

              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-10 p-3"
                  >
                    <div className="grid grid-cols-6 gap-2 w-64">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => insertEmoji(emoji)}
                          className="w-8 h-8 hover:bg-gray-700/50 rounded-lg flex items-center justify-center transition-colors text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              className="p-4 bg-gray-700/90 hover:bg-gray-600/90 text-gray-200 rounded-2xl shadow-lg transition-all flex items-center justify-center"
            >
              <Send size={20} />
            </motion.button>
          </div>
        </footer>
      </section>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 w-96 max-h-[80vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-100">Уведомления</h2>
                <div className="flex items-center gap-2">
                  {unreadNotifications > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Прочитать все
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-2 hover:bg-gray-800/70 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-gray-300" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BellRing size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Нет уведомлений</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-2xl transition-all cursor-pointer group relative ${
                        notification.read ? "bg-gray-800/30" : "bg-gray-800/70"
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            notification.type === "message"
                              ? "bg-blue-600/20 text-blue-400"
                              : notification.type === "call"
                                ? "bg-green-600/20 text-green-400"
                                : "bg-gray-600/20 text-gray-400"
                          }`}
                        >
                          {notification.type === "message" ? (
                            "💬"
                          ) : notification.type === "call" ? (
                            <Phone size={16} />
                          ) : (
                            <Settings size={16} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-200">{notification.title}</h3>
                          <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                        </div>
                        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-700/50 rounded-lg transition-all"
                      >
                        <X size={12} className="text-gray-400" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 w-96 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-100">Настройки</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-800/70 rounded-xl transition-colors"
                >
                  <X size={20} className="text-gray-300" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4">
                    <Bell size={20} className="text-gray-300" />
                    <div>
                      <h3 className="text-gray-100 font-medium">Уведомления</h3>
                      <p className="text-gray-400 text-sm">Получать уведомления о сообщениях</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      notificationsEnabled ? "bg-blue-600" : "bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        notificationsEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    ></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4">
                    {soundEnabled ? (
                      <Volume2 size={20} className="text-gray-300" />
                    ) : (
                      <VolumeX size={20} className="text-gray-300" />
                    )}
                    <div>
                      <h3 className="text-gray-100 font-medium">Звуки</h3>
                      <p className="text-gray-400 text-sm">Звуковые уведомления</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? "bg-blue-600" : "bg-gray-600"}`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        soundEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    ></div>
                  </button>
                </div>

                <button
                  onClick={() => {
                    // Здесь можно добавить переключение темы
                    // Пока просто показываем сообщение
                    alert("Функция переключения темы в разработке")
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 rounded-2xl transition-colors text-left"
                >
                  <Palette size={20} className="text-gray-300" />
                  <div>
                    <h3 className="text-gray-100 font-medium">Тема</h3>
                    <p className="text-gray-400 text-sm">Темная тема включена</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    // Здесь можно добавить настройки приватности
                    alert("Настройки приватности в разработке")
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 rounded-2xl transition-colors text-left"
                >
                  <User size={20} className="text-gray-300" />
                  <div>
                    <h3 className="text-gray-100 font-medium">Приватность</h3>
                    <p className="text-gray-400 text-sm">Кто может видеть ваш статус</p>
                  </div>
                </button>

                <div className="border-t border-gray-800/50 pt-4">
                  <button
                    onClick={() => {
                      // Здесь можно добавить логику выхода
                      setShowSettings(false)
                      // Можно добавить редирект на страницу входа
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-red-900/20 rounded-2xl transition-colors text-red-400"
                  >
                    <LogOut size={20} />
                    <div>
                      <h3 className="font-medium">Выйти</h3>
                      <p className="text-red-400/70 text-sm">Выход из аккаунта</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowProfile(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 w-96 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-100">Профиль</h2>
                <button
                  onClick={() => setShowProfile(false)}
                  className="p-2 hover:bg-gray-800/70 rounded-xl transition-colors"
                >
                  <X size={20} className="text-gray-300" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gray-800/90 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg border border-gray-700/50">
                    {userProfile.avatar}
                  </div>
                  <div
                    className={`absolute -bottom-2 -right-2 w-6 h-6 ${getStatusColor(userProfile.status)} rounded-full border-4 border-gray-900`}
                  ></div>
                </div>
                <h3 className="text-xl font-bold text-gray-100 mb-1">{userProfile.name}</h3>
                <p className="text-sm text-gray-400">{getStatusLabel(userProfile.status)}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Имя</label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="w-full bg-gray-800/70 text-gray-200 border border-gray-700/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600/50"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">О себе</label>
                  <textarea
                    value={userProfile.bio}
                    onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
                    className="w-full bg-gray-800/70 text-gray-200 border border-gray-700/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600/50 resize-none"
                    rows={3}
                  />
                </div>

                <button 
                  onClick={() => {
                    // Здесь можно добавить API вызов для сохранения
                    setShowProfile(false)
                  }}
                  className="w-full bg-gray-700/90 hover:bg-gray-600/90 text-gray-200 py-3 rounded-xl transition-colors font-medium"
                >
                  Сохранить изменения
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowNewChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 w-96 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-100">Новый чат</h2>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="p-2 hover:bg-gray-800/70 rounded-xl transition-colors"
                >
                  <X size={20} className="text-gray-300" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gray-800/90 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg border border-gray-700/50">
                    {newChatAvatar}
                  </div>
                  <div className="flex justify-center gap-2">
                    {["👤", "👩", "👨", "👥", "💻", "🎮", "📚", "🎵"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewChatAvatar(emoji)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          newChatAvatar === emoji ? "bg-gray-700/80" : "hover:bg-gray-800/50"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Название чата</label>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createNewChat()}
                    placeholder="Введите название..."
                    className="w-full bg-gray-800/70 text-gray-200 border border-gray-800/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600/50 placeholder-gray-500"
                    autoFocus
                  />
                </div>

                <button
                  onClick={createNewChat}
                  disabled={!newChatName.trim()}
                  className="w-full bg-gray-700/90 hover:bg-gray-600/90 disabled:bg-gray-800/50 disabled:text-gray-500 text-gray-200 py-3 rounded-xl transition-colors font-medium"
                >
                  Создать чат
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Интерфейс звонка */}
      <AnimatePresence>
        {showCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 w-96 shadow-2xl text-center"
            >
              <div className="mb-6">
                <div className="w-24 h-24 bg-gray-800/90 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg border border-gray-700/50">
                  {currentChat?.avatar || "👤"}
                </div>
                <h2 className="text-xl font-bold text-gray-100 mb-2">{callType === "audio" ? "Аудиозвонок" : "Видеозвонок"}</h2>
                <p className="text-gray-400">{currentChat?.name || "Пользователь"}</p>
                {isInCall && (
                  <p className="text-green-400 text-sm mt-2">{formatCallDuration(callDuration)}</p>
                )}
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={endCall}
                  className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all"
                >
                  <Phone size={24} />
                </button>
                {callType === "video" && (
                  <button className="p-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-full shadow-lg transition-all">
                    <Video size={24} />
                  </button>
                )}
              </div>

              <p className="text-gray-400 text-sm mt-4">
                {isInCall ? "Звонок активен" : "Соединение..."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}


