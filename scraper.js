/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-promise-executor-return */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-unreachable-loop */
import { load } from 'cheerio';
import fetch from 'node-fetch';
import DOMPurify from 'isomorphic-dompurify';
import UserAgent from 'user-agents';
import HttpsProxyAgent from 'https-proxy-agent';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const ycom = 'https://news.ycombinator.com/';
const filePath = './job_data/latest-fetched-jobs.json';

let jobPackage = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getJobPosts = async () => {
  try {
    console.log(`Starting new job postings request: ${new Date()}`);

    const proxy = new HttpsProxyAgent(process.env.PROXY_AGENT);

    const uAgent = new UserAgent({ deviceCategory: 'desktop' });

    const options = {
      agent: proxy,
      headers: {
        'User-Agent': uAgent.data.userAgent,
      },
    };

    // Initial Page Call
    const response = await fetch(`${ycom}submitted?id=whoishiring`, options);
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

    while (!noMorePages) {
      const mostRecentMonthPage = `${ycom}${jobPostPageLinks[0]}&&p=${pageNum}`;
      console.log(`Working on hacker news page ${pageNum}: ${mostRecentMonthPage}`);

      const randomTimeout = Math.floor(Math.random() * (120000 - 30000) + 30000);

      console.log(`Timeout time: ${randomTimeout}`);

      await sleep(randomTimeout);

      console.log(`Timeout Over: Continuing page ${pageNum}`);

      const pageResponse = await fetch(mostRecentMonthPage, options);
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

          const fullLinkText = (p) => {
            const aLinks = [...p.find('a')];
            console.log(aLinks.length);
            const replacements = [];

            aLinks.forEach((link) => {
              const truncatedPath = $(link).contents().text();
              if (!truncatedPath) return;
              replacements.push({ original: truncatedPath, replace: $(link).attr('href') });
            });

            return replacements;
          };

          const content = [...element.find('p')].map((p) => {
            const paragraph = $(p);

            const replacements = fullLinkText(paragraph);

            let text = paragraph.contents().text();

            replacements.forEach(({ original, replace }) => {
              text = text.replace(original, replace);
            });

            return `<p>${text}</p>`;
          }).join('');

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

    fs.writeFileSync(filePath, JSON.stringify(jobPackage));

    console.log(`Success: ${new Date()}`);
  } catch (e) {
    console.error(`Critical Error: ${e} ${new Date()}`);
  }
};

getJobPosts();

const cache = (request, reply) => {
  try {
    jobPackage = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.log('File issue:', e);
  }

  jobPackage = jobPackage || { statusCode: 200, msg: 'service starting up please wait.' };

  reply
    .code(jobPackage.statusCode)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(jobPackage);
};

export default cache;
