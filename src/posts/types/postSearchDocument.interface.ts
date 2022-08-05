interface PostSearchDocument {
    id: number,
    title: string,
    paragraphs: string[],
    authorId: number,
}

export default PostSearchDocument;