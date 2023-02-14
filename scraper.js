/* eslint-disable no-promise-executor-return */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-unreachable-loop */
import { load } from 'cheerio';
import fetch from 'node-fetch';
import DOMPurify from 'isomorphic-dompurify';

const ycom = 'https://news.ycombinator.com/';

let jobPackage = null;

const getJobPosts = async () => {
  // Initial Page Call
  const response = await fetch(`${ycom}submitted?id=whoishiring`);
  const body = await response.text();
  const _ = load(body);

  const allPosts = Array.from(_('.titleline a'), (e) => {
    if (_(e).contents().text().includes('Who is hiring')) {
      return _(e).attr('href');
    }
    return null;
  });

  let month = _('.titleline').contents().first().text();

  [month] = month.match(/\(([^)]+)\)/);

  // Rest of the magic
  const jobPostPageLinks = allPosts.filter((post) => post !== null);
  let pageNum = 1;
  let noMorePages = false;
  let allJobPosts = [];

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  while (!noMorePages) {
    const randomTimeout = Math.floor(Math.random() * 30000) + 10000;

    await sleep(randomTimeout);

    const mostRecentMonthPage = `${ycom}${jobPostPageLinks[0]}&&p=${pageNum}`;

    const pageResponse = await fetch(mostRecentMonthPage);
    const pageBody = await pageResponse.text();

    const $ = load(pageBody);

    const pageJobPosts = async () => {
      const moreLink = $('.morelink').contents().first().text();
      const newArray = Array.from($('.comtr'), (e) => {
        const el = $(e);
        el.find('.reply').remove();

        const indentWidth = el.find('.ind img').attr('width');

        if (indentWidth > 0) {
          return null;
        }

        const element = el.find('.comment .commtext');
        const dateTime = el.find('.age').attr('title');

        if (!element) {
          return null;
        }

        const title = element.contents().first().text();

        const content = [...element.find('p')].map((p) => `<p>${$(p).contents().text()}</p>`).join('');

        return {
          title,
          content,
          dateTime,
          id: el.attr('id'),
        };
      });

      return { moreLink, newArray };
    };

    const { moreLink, newArray } = await pageJobPosts();

    if (!moreLink) {
      noMorePages = true;
    }

    pageNum += 1;

    allJobPosts = newArray.concat(allJobPosts);
  }

  const finalJobs = allJobPosts.map((job) => {
    const data = job;

    if (job && job.title !== '') {
      data.content = DOMPurify.sanitize(job.content, { USE_PROFILES: { html: true } });
      return data;
    }

    return null;
  });

  jobPackage = {
    statusCode: 200, jobs: finalJobs.filter((v) => v !== null), date_updated: new Date(), month,
  };

  const randomHour = Math.floor(Math.random() * 7200000) + 3600000;

  setTimeout(getJobPosts, randomHour);

  return jobPackage;
};

getJobPosts();

const cache = (request, reply) => {
  jobPackage = jobPackage || { statusCode: 200, msg: 'service starting up please wait.' };

  reply
    .code(jobPackage.statusCode)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(jobPackage);
};

export default cache;
