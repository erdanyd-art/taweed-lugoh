import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sidebar } from '@/layouts/Sidebar'

interface NavbarProps {
  title: string
}

export function Navbar({ title }: NavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar className="w-full border-r-0" />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">Admin</p>
          <p className="text-xs text-muted-foreground">Panitia Taweed Lughoh</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">
            A
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
