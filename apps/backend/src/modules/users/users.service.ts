import bcrypt from 'bcryptjs'
import { NotFoundError } from '../../utils/errors'
import { toUserDto, type UserDto } from '../../utils/adapters'
import { usersRepository } from './users.repository'
import type { CreateUserInput, UpdateUserInput } from './users.schema'

export const usersService = {
  async listSubUsers(): Promise<UserDto[]> {
    const rows = await usersRepository.listSubUsers()
    return rows.map(toUserDto)
  },

  async create(input: CreateUserInput): Promise<UserDto> {
    const hash = await bcrypt.hash(input.password, 10)
    // Prisma P2002 (unique constraint) is normalized to ConflictError
    // by the global error handler — no per-call try/catch needed.
    const row = await usersRepository.create({
      username: input.username,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      status: input.active ? 'active' : 'inactive',
      passwordHash: hash,
      via: 'credentials',
    })
    return toUserDto(row)
  },

  async update(id: string, input: UpdateUserInput): Promise<UserDto> {
    const existing = await usersRepository.findById(id)
    if (!existing) throw new NotFoundError('User')
    const data: Record<string, unknown> = {}
    if (input.fullName !== undefined) data.fullName = input.fullName
    if (input.phone !== undefined) data.phone = input.phone
    if (input.role !== undefined) data.role = input.role
    if (input.active !== undefined) data.status = input.active ? 'active' : 'inactive'
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10)
    const row = await usersRepository.update(id, data)
    return toUserDto(row)
  },

  async delete(id: string): Promise<void> {
    const existing = await usersRepository.findById(id)
    if (!existing) throw new NotFoundError('User')
    await usersRepository.delete(id)
  },
}
