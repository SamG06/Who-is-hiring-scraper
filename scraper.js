const puppeter = require('puppeteer');

const getJobPosts = async () => {
    const browser = await puppeter.launch();
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

    const mostRecentMonthPage = `${ycom}${jobPostPageLinks[0]}`;

    await page.goto(mostRecentMonthPage);
    const allJobPosts = await page.evaluate((eval) => {

        return Array.from(document.querySelectorAll('.comtr'), e => { return { post: e.querySelector('.comment').textContent, id: e.id } });
    })
    console.log(allJobPosts)
    const jobPackage = [];
    allJobPosts.forEach((post) => {
        const placement = post.lastIndexOf('|');
        const data = {
            title: post.slice(0, placement + 1),
            content: post.slice(placement + 1, post.length),
        }
        if (data.title != '') {
            jobPackage.push(data);
        }

    })


    return { job: jobPackage }
}

module.exports = getJobPosts;