﻿# Who-is-hiring-scraper

This scrapes the latest month results from [WhoIsHiring (Hacker News)](https://news.ycombinator.com/submitted?id=whoishiring)

It scrapes around every 30 minutes for new posts. You'll get access to the title, content, id, date/time of a job post.

## API Format

Once fetching the the json from the `/jobs` route you can obtain the data as such

```js
const { month, title, content, id, date_time } = jsonData.jobs;
```

### month

A string of the month forum the post was taken from, you can use
this to display the month where every job posting was from `i.e "September 2021"`

### title

A string of the job posting title, some false positives due to incorrect poster format but generally no issues `i.e "Vue | US Remote-First| Junior "`

### content

HTML of the job posting, displaying all the job information. Purified with [DOMPurify](https://github.com/cure53/DOMPurify) so you can set innerHTML without worry (probably). You're free to include another solution. `i.e "<p>Job Content</p>"`

### id

This is the job posting id which is a string of numbers, you can use this for keys in your lists, and also link directly to the original post by `https://news.ycombinator.com/item?id=POSTIDHERE` **REPLACE "POSTIDHERE" WITH THE JOB POST ID OPTION**

### date_time

The date of when the job posting was created in ISO 8601 format. There was no timezone offset added but it seems they're using UTC time. Just add a `Z` to the string for UTC time. `i.e 2021-09-02T20:47:12Z` **add the Z manually**
