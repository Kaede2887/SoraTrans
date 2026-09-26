interface VndbBody {
    filters: any,
    fields: string 
}

interface VndbRes {
    more: boolean,
    results: GameRes[]
}

interface GameRes {
    description: string,
    developers: developersRes[],
    id: string,
    image: {url:string},
    rating: number,
    tags: tagRes[],
    title: string
}

interface developersRes {
    id: string,
    name: string
}

interface tagRes{
    id: string,
    name: string,
    category: string,
    vn_count: number,
    description: string
}

export type {VndbBody,VndbRes,GameRes,tagRes}

