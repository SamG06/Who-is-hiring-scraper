/* eslint-disable import/extensions */
import Fastify from 'fastify';
// CommonJs

import scraper from './scraper.js';

const fastify = Fastify({
  logger: true,
});

fastify.get('/', (request, reply) => {
  reply.send({ message: 'Scraper for hacker news whoishiring' });
});

fastify.route({ method: 'GET', url: '/whoishiring/jobs', handler: scraper });

fastify.listen(3001, '0.0.0.0', (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
});
