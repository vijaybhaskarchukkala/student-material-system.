export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-0 sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl sm:h-[900px] sm:max-h-[92vh] sm:rounded-[2.5rem] sm:border-8 sm:border-foreground/90">
        {children}
      </div>
    </div>
  )
}
