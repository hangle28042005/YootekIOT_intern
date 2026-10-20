import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([200, 201, 400, 404, 409, 500])(
    'logs the method, original URL, final status %s and elapsed time after the response finishes',
    (statusCode) => {
      const log = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1025);
      const req = { method: 'GET', originalUrl: '/users?limit=10' } as Request;
      const res = Object.assign(new EventEmitter(), {
        statusCode: 200,
      }) as unknown as Response;
      const next = jest.fn();

      new LoggerMiddleware().use(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(log).not.toHaveBeenCalled();
      res.statusCode = statusCode;
      res.emit('finish');
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(
        `GET /users?limit=10 ${statusCode} - 25ms`,
      );
    },
  );
});
