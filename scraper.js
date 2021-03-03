const puppeteer = require('puppeteer');

const minutes = 600 * 3000
setInterval(() => {
    console.log('updated job posts', new Date())
    getJobPosts();
}, minutes)

let jobPackage = null;

const getJobPosts = async () => {
    const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
            request.abort();
        } else {
            request.continue();
        }
    });
    const ycom = 'https://news.ycombinator.com/'
    // The main page with all the listings for whoishiring
    await page.goto(ycom + 'submitted?id=whoishiring');

    // Grab all posts
    const allPosts = await page.evaluate(() => Array.from(document.querySelectorAll('.storylink'), e => {
        if (e.textContent.includes('Who is hiring')) {
            return e.getAttribute('href');
        }
    }));

    const jobPostPageLinks = allPosts.filter(x => x !== null);
    let pageNum = 1;
    let noMorePages = false;
    let allJobPosts = [];

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    while (noMorePages === false) {
        await sleep(9000);
        const mostRecentMonthPage = `${ycom}${jobPostPageLinks[0]}&&p=${pageNum}`;

        console.log(pageNum)
        await page.goto(mostRecentMonthPage, 'rm');

        const pageJobPosts = await page.evaluate((eval) => {
            const moreLink = document.querySelector('.moreLink');

            const newArray = Array.from(document.querySelectorAll('.comtr'), e => { return { text: e.querySelector('.comment').textContent, id: e.id } });

            return { moreLink, newArray };
        })

        const { moreLink, newArray } = pageJobPosts;
        allJobPosts = newArray.concat(allJobPosts);

        if (!moreLink) {
            noMorePages = true;
        }

        pageNum += 1;
    }


    const newJobPackage = [];
    allJobPosts.forEach(({ text, id }) => {
        const placement = text.lastIndexOf('|');
        const data = {
            title: text.slice(0, placement + 1),
            content: text.slice(placement + 1, text.length),
            id

        }
        if (data.title != '') {
            newJobPackage.push(data);
        }

    })

    jobPackage = newJobPackage;
    return jobPackage
}

getJobPosts();

const sendJobPackage = () => {
    if (!jobPackage) {
        return getJobPosts();
    }
    return jobPackage;
}

module.exports = sendJobPackage;