import { decodeToken } from '../jwt';
import { tokenStorage } from '../tokenStorage';
import { request } from './http';

/**
 * The real-backend twin of `createLocalCollectionApi`: the same
 * `fetchAll / create / update / remove` surface, so the Redux slices do not know
 * which one they are talking to.
 */

const PAGE = { size: 100 };

function signedInName() {
  return decodeToken(tokenStorage.read()).payload.name;
}

const toPost = (post) => ({ ...post, authorId: post.authorName });

export function createPostsApi() {
  return {
    async fetchAll() {
      const page = await request({
        path: '/api/v1/posts',
        query: { status: 'PUBLISHED', ...PAGE },
      });
      return page.items.map(toPost);
    },

    // The author comes from the signed-in user, so the composer cannot name
    // someone else; the server records it against the post.
    async create(attributes) {
      return toPost(
        await request({
          method: 'POST',
          path: '/api/v1/posts',
          body: { ...attributes, authorName: signedInName(), status: 'PUBLISHED' },
        }),
      );
    },

    async remove(id) {
      await request({ method: 'DELETE', path: `/api/v1/posts/${id}` });
      return id;
    },
  };
}

export function createScheduleApi() {
  return {
    async fetchAll() {
      const page = await request({ path: '/api/v1/schedule', query: PAGE });
      return page.items.map(toPost);
    },

    async create(attributes) {
      return toPost(
        await request({
          method: 'POST',
          path: '/api/v1/schedule',
          body: { ...attributes, authorName: signedInName() },
        }),
      );
    },

    async update(id, { scheduledFor }) {
      return toPost(
        await request({
          method: 'PATCH',
          path: `/api/v1/schedule/${id}`,
          body: { scheduledFor },
        }),
      );
    },

    async remove(id) {
      await request({ method: 'DELETE', path: `/api/v1/schedule/${id}` });
      return id;
    },
  };
}

/** Aggregates computed by the backend's SQL (experiment 2.2): counts per platform and status, leaders. */
export const statsApi = {
  overview() {
    return request({ path: '/api/v1/stats', query: { topAuthors: 5, topPosts: 5 } });
  },
};
