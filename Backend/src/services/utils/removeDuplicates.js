function deduplicate(articles){
    const seenUrl = new Set();
    const seenTitles = new Set();

    const unique = articles.filter(article=>{
        const url = article.url?.toLowerCase();
        const title = article.title?.toLowerCase().trim();

        if(url && seenUrl.has(url)){
            return false;
        }

        if(title && seenTitles.has(title)){
            return false;
        }

        if(url){
            seenUrl.add(url);
        }

        if(title){
            seenTitles.add(title);
        }

        return true;
    });

    console.log(`Deduplicated ${unique.length} unique articles found`);
    return unique;

}

module.exports = {deduplicate};
