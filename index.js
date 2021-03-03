const fastify = require('fastify')({
    logger: true
})

fastify.register(require('fastify-cors'), {
    origin: '*'
})

const scraper = require('./scraper.js');

fastify.get('/', function (request, reply) {
    reply.send({ message: 'Scraper for hacker news whoishiring' })
})

fastify.route({ method: 'GET', url: '/jobs', handler: scraper })

fastify.listen(process.env.PORT, '0.0.0.0', function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    fastify.log.info(`server listening on ${address}`)
})