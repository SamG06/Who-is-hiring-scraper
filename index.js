/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable import/extensions */
import Fastify from 'fastify';
import cron from 'node-cron';
import fastifyCors from 'fastify-cors';
import scraper, { getJobPosts } from './scraper.js';

cron.schedule('0 0 */12 * * *', () => {
  console.log(`Cron execution: ${new Date()}`);
  getJobPosts();
});

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyCors, {
  origin: '*',
});

fastify.get('/', (request, reply) => {
  reply.send({ message: 'Scraper for hacker news whoishiring' });
});

fastify.route({ method: 'GET', url: '/whoishiring/jobs', handler: scraper });

fastify.listen(3001, '0.0.0.0', (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
