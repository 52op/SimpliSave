import { useState, useCallback, createContext, useContext, type ReactNode } from "react"
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  confirm: (message: string) => Promise<boolean>
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  confirm: async () => false,
})

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null)
  const [confirmResolve, setConfirmResolve] = useState<((v: boolean) => void) | null>(null)

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmMsg(message)
      setConfirmResolve(() => resolve)
    })
  }, [])

  const handleConfirm = (value: boolean) => {
    confirmResolve?.(value)
    setConfirmMsg(null)
    setConfirmResolve(null)
  }

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />,
  }

  const bgMap = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  }

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg min-w-[280px] max-w-sm animate-slide-in ${bgMap[t.type]}`}
          >
            {iconMap[t.type]}
            <span className="text-sm text-gray-800 flex-1">{t.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmMsg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <p className="text-gray-800 mb-6">{confirmMsg}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => handleConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">取消</button>
              <button onClick={() => handleConfirm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">确定</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
