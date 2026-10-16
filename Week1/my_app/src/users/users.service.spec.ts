import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates a unique ID after deleting an earlier user', () => {
    service.remove(1);

    const user = service.create({ name: 'Alice', email: 'alice@example.com' });
    const ids = service.findAll().map((item) => item.id);

    expect(user.id).toBe(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(service.findOne(2).name).toBe('Binh');
  });

  it('does not reuse IDs after deleting the newest user or all users', () => {
    const first = service.create({ name: 'Alice', email: 'alice@example.com' });
    service.remove(first.id);
    const second = service.create({ name: 'Bob', email: 'bob@example.com' });
    expect(second.id).toBeGreaterThan(first.id);

    for (const user of service.findAll()) {
      service.remove(user.id);
    }

    const third = service.create({ name: 'Carol', email: 'carol@example.com' });
    expect(third.id).toBeGreaterThan(second.id);
  });

  it('does not allow payload fields to replace the generated ID', () => {
    const payload = { id: 999, name: 'Alice', email: 'alice@example.com' };

    expect(service.create(payload).id).toBe(3);
  });

  it('throws 404 for reads, updates and deletes of a missing user', () => {
    expect(() => service.findOne(999)).toThrow(NotFoundException);
    expect(() =>
      service.update(999, { name: 'Alice', email: 'alice@example.com' }),
    ).toThrow(NotFoundException);
    expect(() => service.remove(999)).toThrow(NotFoundException);
    expect(service.findAll()).toHaveLength(2);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects the invalid numeric ID %s',
    (id) => {
      expect(() => service.findOne(id)).toThrow(BadRequestException);
    },
  );

  it('updates a user without changing its ID', () => {
    const updated = service.update(1, {
      name: 'Updated',
      email: 'updated@example.com',
    });

    expect(updated).toEqual({
      id: 1,
      name: 'Updated',
      email: 'updated@example.com',
    });
    expect(service.findOne(1)).toEqual(updated);
  });
});
