import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISearchedMoviesOrSeries } from '@/types';

/**
 * Scrape searched movies or series
 * @param {Request} req
 * @param {AxiosResponse} res
 * @returns {Promise.<ISearchedMoviesOrSeries[]>} array of movies or series
 */
export const scrapeSearchedMoviesOrSeries = async (
    req: Request,
    res: AxiosResponse
): Promise<ISearchedMoviesOrSeries[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISearchedMoviesOrSeries[] = [];
    const {
        headers: { host },
        protocol,
    } = req;

    // Use the same selector as scrapeMovies: div.gallery-grid figure
    const items = $('div.gallery-grid figure').length > 0 
        ? $('div.gallery-grid figure') 
        : $('div.search-item'); // Fallback to old selector just in case

    items.each((i, el) => {
        const link = $(el).find('a').first();
        const obj = {} as ISearchedMoviesOrSeries;
        const genres: string[] = [];

        // Extract genres
        const genreText = $(el).find('figcaption > div.genre').text().trim();
        if (genreText) {
            genres.push(...genreText.split(',').map(g => g.trim().toLowerCase()));
        }

        const href = link.attr('href') || '';
        const hrefParts = href.split('/').filter(Boolean);
        const movieId = hrefParts.pop() || '';
        
        // Determine type based on URL structure or logic
        let type: 'movie' | 'series' = 'movie';
        if (href.includes('/series/') || href.includes('/tv/')) {
            type = 'series';
        }

        obj['_id'] = movieId;
        obj['title'] = $(el).find('figcaption > h3').text().trim();
        obj['type'] = type;
        
        // Extract poster
        const posterSrc = $(el).find('div.poster img').attr('src') || '';
        obj['posterImg'] = posterSrc.startsWith('http') ? posterSrc : `https:${posterSrc}`;
        
        obj['url'] = `${protocol}://${host}/${type}/${movieId}`;
        obj['genres'] = genres;
        
        // Directors and casts are not typically available in grid view
        obj['directors'] = [];
        obj['casts'] = [];

        payload.push(obj);
    });

    return payload;
};
