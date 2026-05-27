/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Logger } from '../../utils/Logger.js'
import { RequestHandler } from '../../utils/RequestHandler.js'
import { ThemeConfig } from '../../config/ThemeConfig.js'
import { BaseController } from '../BaseController.js'
import fs from 'fs'
import path from 'path'

const logger = new Logger()
const requestHandler = new RequestHandler(logger)

class ThemeController extends BaseController {
  static getAdminTheme = async (req, res) => {
    try {
      const themeConfigData = {
        admin: {
          header_bg: ThemeConfig.admin.header_bg,
          header_text: ThemeConfig.admin.header_text,
          heading_fs: ThemeConfig.admin.heading_fs,
          body_fs: ThemeConfig.admin.body_fs,
          menu_text: ThemeConfig.admin.menu_text,
          menu_fs: ThemeConfig.admin.menu_fs,
          button_bg: ThemeConfig.admin.button_bg,
          button_text: ThemeConfig.admin.button_text,
          theme_text: ThemeConfig.admin.theme_text,
          back_button: ThemeConfig.admin.back_button,
          footer_text: ThemeConfig.admin.footer_text,
          footer_bg: ThemeConfig.admin.footer_bg
        }
      }
      return requestHandler.sendSuccess(
        req,
        res,
        'GET_THEME_CONFIG'
      )({ message: 'SUCCESS', data: themeConfigData })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }

  static updateAdminTheme = async (req, res) => {
    try {
      const body = req.body
      const themeConfigObj = ThemeConfig

      ;(themeConfigObj.admin.header_bg = body.header_bg || themeConfigObj.admin.header_bg),
        (themeConfigObj.admin.header_text = body.header_text || themeConfigObj.admin.header_text),
        (themeConfigObj.admin.heading_fs = body.heading_fs || themeConfigObj.admin.heading_fs),
        (themeConfigObj.admin.body_fs = body.body_fs || themeConfigObj.admin.body_fs),
        (themeConfigObj.admin.menu_text = body.menu_text || themeConfigObj.admin.menu_text),
        (themeConfigObj.admin.menu_fs = body.menu_fs || themeConfigObj.admin.menu_fs),
        (themeConfigObj.admin.button_bg = body.button_bg || themeConfigObj.admin.button_bg),
        (themeConfigObj.admin.button_text = body.button_text || themeConfigObj.admin.button_text),
        (themeConfigObj.admin.theme_text = body.theme_text || themeConfigObj.admin.theme_text),
        (themeConfigObj.admin.back_button = body.back_button || themeConfigObj.admin.back_button),
        (themeConfigObj.admin.footer_text = body.footer_text || themeConfigObj.admin.footer_text),
        (themeConfigObj.admin.footer_bg = body.footer_bg || themeConfigObj.admin.footer_bg)

      const __dirname = path.resolve()
      const filePath = `${__dirname}/config/ThemeConfig.js`
      const fileContent = `
const ThemeConfig = ${JSON.stringify(themeConfigObj, null, 2)}
export { ThemeConfig }
        `

      await fs.writeFileSync(filePath, fileContent)

      return requestHandler.sendSuccess(
        req,
        res,
        'CREATE_CONFIG'
      )({ message: 'UPDATED', configuration: themeConfigObj })
    } catch (error) {
      return requestHandler.sendError(req, res, error)
    }
  }
}
export { ThemeController }
