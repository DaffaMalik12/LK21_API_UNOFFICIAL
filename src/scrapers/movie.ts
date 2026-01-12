import { Request } from 'express';
import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { IMovies, IMovieDetails } from '@/types';

/**
 * Scrape movies asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IMovies[]>} array of movies objects
 */
export const scrapeMovies = async (
    req: Request,
    res: AxiosResponse
): Promise<IMovies[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: IMovies[] = [];
    const {
        protocol,
        headers: { host },
    } = req;

    // New structure: div.gallery-grid contains figure elements
    $('div.gallery-grid')
        .find('figure')
        .each((i, el) => {
            const parent: cheerio.Cheerio = $(el);
            const link: cheerio.Cheerio = $(parent).find('a');
            const genres: string[] = [];

            // Extract genres from plain text (e.g., "Comedy, Drama")
            const genreText = $(link).find('figcaption > div').first().text().trim();
            if (genreText) {
                genres.push(...genreText.split(',').map(g => g.trim().toLowerCase()));
            }

            // Extract movie ID from href
            const href = $(link).attr('href') ?? '';
            const movieId: string = href.split('/').filter(Boolean).pop() ?? '';

            const obj = {} as IMovies;

            obj['_id'] = movieId;
            obj['title'] = $(link).find('figcaption > h3').text().trim() ?? '';
            obj['type'] = 'movie';
            
            // Get poster image
            const posterSrc = $(link).find('div.poster img').attr('src') ?? '';
            obj['posterImg'] = posterSrc.startsWith('http') ? posterSrc : `https:${posterSrc}`;
            
            // Get rating
            obj['rating'] = $(link).find('span.rating span[itemprop="ratingValue"]').text().trim();
            
            obj['url'] = `${protocol}://${host}/movies/${movieId}`;
            
            // Get quality/resolution (e.g., HD, CAM, etc.)
            obj['qualityResolution'] = $(link).find('span[class*="label-"]').text().trim();
            
            obj['genres'] = genres;

            payload.push(obj);
        });

    return payload;
};

/**
 * Scrape movie details asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IMovieDetails>} movie details object
 */
export const scrapeMovieDetails = async (
    req: Request,
    res: AxiosResponse
): Promise<IMovieDetails> => {
    const { originalUrl } = req;

    const $: cheerio.Root = cheerio.load(res.data);
    const obj = {} as IMovieDetails;

    const genres: string[] = [];
    const directors: string[] = [];
    const countries: string[] = [];
    const casts: string[] = [];

    // Extract movie ID from URL
    obj['_id'] = originalUrl.split('/').reverse()[0];
    obj['type'] = 'movie';

    // Extract title from h1 tag
    const titleText = $('h1').first().text().trim();
    obj['title'] = titleText;

    // Extract poster from meta tag or img
    const posterMeta = $('meta[property="og:image"]').attr('content');
    const posterImg = $('div.detail img').first().attr('src');
    obj['posterImg'] = posterMeta || (posterImg?.startsWith('http') ? posterImg : `https:${posterImg}`) || '';

    // Extract info tags (rating, quality, resolution, duration)
    const infoTags = $('div.info-tag span');
    if (infoTags.length > 0) {
        // Rating is usually in the first span with strong tag
        const ratingEl = $('div.info-tag span strong').first();
        obj['rating'] = ratingEl.text().trim();

        // Quality, resolution, duration are in subsequent spans
        infoTags.each((i, el) => {
            const text = $(el).text().trim();
            // Quality: WEBDL, HD, CAM, Bluray, etc.
            if (/^(WEBDL|HD|CAM|Bluray|HDTV|WEB-DL)/i.test(text)) {
                obj['quality'] = text;
            }
            // Resolution: 1080p, 720p, etc.
            else if (/^\d{3,4}p$/.test(text)) {
                // Resolution is stored but not in the interface, we can skip or add to quality
            }
            // Duration: 1h 33m, 2h 15m, etc.
            else if (/^\d+h\s+\d+m$/.test(text)) {
                obj['duration'] = text;
            }
        });
    }

    // Extract genres and countries from tag-list
    $('div.tag-list a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        
        if (href.includes('/genre/')) {
            genres.push(text);
        } else if (href.includes('/country/')) {
            countries.push(text);
        }
    });

    // Extract synopsis from .synopsis div with data-full attribute
    const synopsisEl = $('div.synopsis');
    const synopsisFull = synopsisEl.attr('data-full');
    const synopsisText = synopsisFull || synopsisEl.text().trim();
    obj['synopsis'] = synopsisText.replace('Lihat selengkapnya', '').trim();

    // Extract trailer URL from YouTube lightbox button
    const trailerBtn = $('a.yt-lightbox').first();
    obj['trailerUrl'] = trailerBtn.attr('href') || '';

    // Directors and casts might be in a different section or not available in new structure
    // We'll leave them empty for now unless we find the correct selectors
    $('div.cast-list a, div.director-list a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        
        if (href.includes('/director/')) {
            directors.push(text);
        } else if (href.includes('/cast/') || href.includes('/actor/')) {
            casts.push(text);
        }
    });

    // Extract video server URLs from "GANTI PLAYER" section
    const videoServers: { server: string; url: string }[] = [];
    $('a[href*="playeriframe.sbs"]').each((i, el) => {
        const serverName = $(el).text().trim();
        const serverUrl = $(el).attr('href') || '';
        
        if (serverName && serverUrl) {
            videoServers.push({
                server: serverName,
                url: serverUrl
            });
        }
    });

    obj['genres'] = genres;
    obj['directors'] = directors;
    obj['countries'] = countries;
    obj['casts'] = casts;
    obj['videoServers'] = videoServers;

    return obj;
};
