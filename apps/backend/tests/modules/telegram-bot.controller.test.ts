import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const mocks = vi.hoisted(() => ({
  ingestFromText: vi.fn(),
  findRoomIdByChatId: vi.fn(),
  isNotificationChat: vi.fn(),
  sendBotMessage: vi.fn(),
}))

vi.mock('../../src/modules/bankPayments/bankPayments.service', () => ({
  bankPaymentsService: {
    ingestFromText: mocks.ingestFromText,
  },
}))

vi.mock('../../src/modules/telegramLinks/telegramLinks.service', () => ({
  telegramLinksService: {
    consumeCode: vi.fn(),
    upsertLink: vi.fn(),
    findRoomIdByChatId: mocks.findRoomIdByChatId,
  },
}))

vi.mock('../../src/modules/bankNotificationGroups/bankNotificationGroups.service', () => ({
  bankNotificationGroupsService: {
    consumeCode: vi.fn(),
    upsertGroup: vi.fn(),
    isNotificationChat: mocks.isNotificationChat,
  },
}))

vi.mock('../../src/modules/telegramBot/telegramBot.client', () => ({
  sendBotMessage: mocks.sendBotMessage,
}))

let telegramBotController: typeof import('../../src/modules/telegramBot/telegramBot.controller').telegramBotController

beforeAll(async () => {
  process.env.TELEGRAM_BANK_WEBHOOK_SECRET = 'test_webhook_secret'
  telegramBotController = (await import('../../src/modules/telegramBot/telegramBot.controller')).telegramBotController
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findRoomIdByChatId.mockResolvedValue(null)
  mocks.isNotificationChat.mockResolvedValue(true)
  mocks.sendBotMessage.mockResolvedValue(true)
})

describe('telegram bot webhook', () => {
  it('ingests a bank message when /pay replies to the original notification', async () => {
    mocks.ingestFromText.mockResolvedValue({
      ok: true,
      payment: {
        amount: { toString: () => '4000' },
        currency: 'KHR',
        transactionId: 'TXN-42',
        bank: 'ACLEDA',
      },
    })

    const { req, res } = mockWebhook({
      message: {
        message_id: 77,
        chat: { id: -1001, type: 'group', title: 'Payments' },
        text: '/pay',
        reply_to_message: {
          message_id: 76,
          text: 'Amount: KHR 4,000\nSender: Sok Dara\nTransaction ID: TXN-42',
        },
      },
    })

    await telegramBotController.webhook(req, res)

    expect(mocks.ingestFromText).toHaveBeenCalledWith({
      text: 'Amount: KHR 4,000\nSender: Sok Dara\nTransaction ID: TXN-42',
      chatId: '-1001',
      messageId: 77,
      roomId: null,
    })
    expect(mocks.sendBotMessage).toHaveBeenCalledWith('-1001', '✓ Payment saved: 4000 KHR')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })

  it('asks for payment text when /pay has no text and no reply', async () => {
    const { req, res } = mockWebhook({
      message: {
        message_id: 88,
        chat: { id: -1001, type: 'group', title: 'Payments' },
        text: '/pay',
      },
    })

    await telegramBotController.webhook(req, res)

    expect(mocks.ingestFromText).not.toHaveBeenCalled()
    expect(mocks.sendBotMessage).toHaveBeenCalledWith(
      '-1001',
      'Paste the bank confirmation after /pay, or reply /pay to the bank message.',
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})

function mockWebhook(body: unknown): { req: Request; res: Response } {
  const req = {
    body,
    header: vi.fn((name: string) =>
      name.toLowerCase() === 'x-telegram-bot-api-secret-token' ? 'test_webhook_secret' : '',
    ),
  } as unknown as Request

  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response
  vi.mocked(res.status).mockReturnValue(res)
  vi.mocked(res.json).mockReturnValue(res)

  return { req, res }
}
