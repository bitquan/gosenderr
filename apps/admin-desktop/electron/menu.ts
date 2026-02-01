import { Menu, MenuItemConstructorOptions, BrowserWindow, shell } from 'electron'

export function createMenu(mainWindow: BrowserWindow) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'GoSenderr Admin',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ]
  return Menu.buildFromTemplate(template)
}
