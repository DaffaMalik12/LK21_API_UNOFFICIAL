export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface IMovies {
    _id: string;
    title: string;
    type: 'movie' | 'series';
    posterImg: string;
    rating: string;
    url: string;
    qualityResolution: string;
    genres: string[];
}

export interface IMovieDetails
    extends Omit<IMovies, 'url' | 'qualityResolution'> {
    quality: string;
    releaseDate: string;
    synopsis: string;
    duration: string;
    trailerUrl: string;
    directors: string[];
    countries: string[];
    casts: string[];
    videoServers: { server: string; url: string }[];
}

export interface IStreamSources {
    provider: string;
    url: string;
    resolutions: string[];
}

export interface ISetOfGenres {
    parameter: string;
    name: string;
    numberOfContents: number;
    url: string;
}

export interface ISetOfCountries {
    parameter: string;
    name: string;
    numberOfContents: number;
    url: string;
}

export interface ISetOfYears {
    parameter: string;
    numberOfContents: number;
    url: string;
}

export interface ISeries extends Omit<IMovies, 'qualityResolution'> {
    episode: number;
}

export interface IEpisode {
    _id: string;
    episode: number;
    url: string;
}

export interface ISeasonsList {
    season: number;
    totalEpisodes: number;
    episodes: IEpisode[];
}

export interface ISeriesDetails extends Omit<ISeries, 'url'> {
    status: string;
    releaseDate: string;
    synopsis: string;
    duration: string;
    trailerUrl: string;
    directors: string[];
    countries: string[];
    casts: string[];
    seasons: ISeasonsList[];
    latestEpisodeUrl?: string;
}

export interface ISearchedMoviesOrSeries {
    _id: string;
    title: string;
    type: 'movie' | 'series';
    posterImg: string;
    url: string;
    genres: string[];
    directors: string[];
    casts: string[];
}

export interface IDownloads {
    server: string;
    link: string;
    quality: string;
}
