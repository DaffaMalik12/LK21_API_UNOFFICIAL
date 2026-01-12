import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISeasonsList, ISeries, ISeriesDetails } from '@/types';

/**
 * Scrape series asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISeries>} array of series objects
 */
export const scrapeSeries = async (
    req: Request,
    res: AxiosResponse
): Promise<ISeries[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISeries[] = [];
    const {
        headers: { host },
        protocol,
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

            // Extract series ID from href
            const href = $(link).attr('href') ?? '';
            const seriesId: string = href.split('/').filter(Boolean).pop() ?? '';

            const obj = {} as ISeries;

            obj['_id'] = seriesId;
            obj['title'] = $(link).find('figcaption > h3').text().trim() ?? '';
            obj['type'] = 'series';
            
            // Get poster image
            const posterSrc = $(link).find('div.poster img').attr('src') ?? '';
            obj['posterImg'] = posterSrc.startsWith('http') ? posterSrc : `https:${posterSrc}`;
            
            // Try to extract episode number if available
            const episodeText = $(link).find('span.episode').text().trim();
            obj['episode'] = episodeText ? Number(episodeText.replace(/\D/g, '')) : 0;
            
            // Get rating
            obj['rating'] = $(link).find('span.rating span[itemprop="ratingValue"]').text().trim();
            
            obj['url'] = `${protocol}://${host}/series/${seriesId}`;
            obj['genres'] = genres;

            payload.push(obj);
        });

    return payload;
};

/**
 * Scrape series details asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISeriesDetails>} series details object
 */
export const scrapeSeriesDetails = async (
    req: Request,
    res: AxiosResponse
): Promise<ISeriesDetails> => {
    const { originalUrl } = req;

    const $: cheerio.Root = cheerio.load(res.data);
    const obj = {} as ISeriesDetails;

    const genres: string[] = [];
    const directors: string[] = [];
    const countries: string[] = [];
    const casts: string[] = [];

    $('div.content').find('blockquote').find('strong').remove();

    obj['_id'] = originalUrl.split('/').reverse()[0];
    obj['title'] =
        $('div.content-poster').find('figure > picture > img').attr('alt') ??
        '';
    obj['type'] = 'series';
    obj['posterImg'] = `https:${$('div.content-poster')
        .find('figure > picture > img')
        .attr('src')}`;

    $('div.content > div').each((i, el) => {
        /* eslint-disable */
        switch ($(el).find('h2').text().toLowerCase()) {
            case 'durasi':
                obj['duration'] = $(el).find('h3').text().trim();
                break;
            case 'imdb':
                obj['rating'] = $(el).find('h3:nth-child(2)').text().trim();
                break;
            case 'diterbitkan':
                obj['releaseDate'] = $(el).find('h3').text().trim();
                break;
            case 'status':
                obj['status'] = $(el)
                    .find('h3 > span')
                    .text()
                    .toLowerCase()
                    .trim();
                break;
            case 'sutradara':
                $(el)
                    .find('h3 > a')
                    .each((i, el) => {
                        directors.push($(el).text().trim());
                    });
                break;
            case 'negara':
                $(el)
                    .find('h3 > a')
                    .each((i, el) => {
                        countries.push($(el).text());
                    });
                break;
            case 'genre':
                $(el)
                    .find('h3 > a')
                    .each((i, el) => {
                        genres.push($(el).text());
                    });
                break;
            case 'bintang film':
                $(el)
                    .find('h3')
                    .each((i, el) => {
                        casts.push($(el).find('a').text());
                    });
                break;
            default:
                break;
        }
        /* eslint-enable */
    });

    obj['synopsis'] = $('div.content').find('blockquote').text();
    obj['trailerUrl'] = `${$('div.player-content > iframe').attr('src')}`;
    obj['genres'] = genres;
    obj['directors'] = directors;
    obj['countries'] = countries;
    obj['casts'] = casts;

    const epsElem: cheerio.Cheerio = $('div.serial-wrapper > div.episode-list');
    const seasons: ISeasonsList[] = [];

    for (let i = epsElem.length; i >= 1; i--) {
        const obj2 = {} as ISeasonsList;

        obj2['season'] = i;
        obj2['totalEpisodes'] = $(epsElem[epsElem.length - i]).find(
            'a.btn-primary'
        ).length;

        seasons.push(obj2);
    }

    obj['seasons'] = seasons;

    return obj;
};
