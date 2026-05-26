import { Router } from 'express'
import { telegramBotController } from './telegramBot.controller'
import { asyncHandler } from '../../middleware/async-handler'

// Public route — Telegram itself calls this. Authenticated via the
// X-Telegram-Bot-Api-Secret-Token header inside the controller.
export const telegramBotRouter = Router()

telegramBotRouter.post('/webhook', asyncHandler(telegramBotController.webhook))
