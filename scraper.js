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
        console.log(e.textContent)
        if (e.textContent.includes('Who is hiring')) {
            return e.getAttribute('href');
        }
    }));

    const jobPostPageLinks = allPosts.filter(x => x !== null);

    console.log(jobPostPageLinks);

    const mostRecentMonthPage = `${ycom}${jobPostPageLinks[0]}`;

    await page.goto(mostRecentMonthPage);
    const allJobPosts = await page.evaluate(() => Array.from(document.querySelectorAll('.comment'), e => e.textContent))
    const jobPackage = [];
    allJobPosts.forEach((post) => {
        const placement = post.lastIndexOf('|');
        const data = {
            title: post.slice(0, placement + 1),
            content: post.slice(placement + 1, post.length),
        }
        jobPackage.push(data);

    })
    console.log(jobPackage);


    return { job: 'data' }
}

module.exports = getJobPosts;