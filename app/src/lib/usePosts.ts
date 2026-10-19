import { useEffect, useState } from 'react';

import { loadPosts, subscribePosts, type Post } from './posts';

/** All saved posts; `onAdded` runs when a new one is posted. */
export function usePosts(onAdded?: (post: Post) => void) {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    let alive = true;
    loadPosts().then((p) => alive && setPosts(p));
    const unsubscribe = subscribePosts((added) => {
      loadPosts().then((p) => alive && setPosts([...p]));
      if (added) onAdded?.(added);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [onAdded]);
  return posts;
}
