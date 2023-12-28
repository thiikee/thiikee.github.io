import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js'
import { getAuth, signInWithPopup, OAuthProvider, setPersistence, browserSessionPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js'
import { getFirestore, collection, query, where, orderBy, getDocs, doc, addDoc, setDoc, serverTimestamp, limit, startAt, endAt, startAfter } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js'
import { setAlbums } from './albums.js';
import { setArtists } from './artists.js';
import { setTags } from './tags.js';
import { setTypes } from './types.js';
import { setWomen, setWomenAliases } from './women.js';
export { signInDatabase, getPosts, getAllTypes, getAllAlbums, getAllWomen, getAllAliases, getAllArtists, getAllTags,
  savePost, saveWoman, saveArtist, saveTag, auth, isOnline };

const isOnline = true;
const firebaseConfig = {
  apiKey: 'AIzaSyCRFQdEjgM97Yx3z7T94lK-dQ3F5NiAE1c',
  projectId: 'my-fruits-basket',
  authDomain: "my-fruits-basket.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
var sqldb;
var lastVisible;

initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
}).then(async function(SQL) {
let sqlFilePath = "/my-fruits-basket/db.sqlite";
const dataPromise = await fetch(sqlFilePath).then(res => res.arrayBuffer());
const u8array = new Uint8Array(dataPromise);
sqldb = new SQL.Database(new Uint8Array(u8array));
//let query = "SELECT name FROM women";
//let contents = sqldb.exec(query);
//res = JSON.stringify(contents);
//console.log(contents);
});

function signInDatabase() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      //setPersistence(auth, browserSessionPersistence)
      //.then(() => {
      //  if (!user) {
          const provider = new OAuthProvider('microsoft.com');
          signInWithPopup(auth, provider)
          .then((result) => {
            //console.log(result);
            // The signed-in user info.
            user = result.user;
            console.log(user);
            setTypes(getAllTypes());
            setAlbums(getAllAlbums());
            setWomen(getAllWomen());
            setWomenAliases(getAllAliases());
            setArtists(getAllArtists());
            setTags(getAllTags());
          }).catch((error) => {
            console.log(error);
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
          });
      //  }
      //});
    } else {
      setTypes(getAllTypes());
      setAlbums(getAllAlbums());
      setWomen(getAllWomen());
      setWomenAliases(getAllAliases());
      setArtists(getAllArtists());
      setTags(getAllTags());
    }
  });
}

async function getPosts(criteria, lastVisibleCount, callback) {
  if (sqldb) {
    console.log(criteria);
    var womenJoin = '';
    if (criteria.women && criteria.women.length > 0) {
      if (criteria.womenOr) {
        womenJoin = 'INNER JOIN [cast] ON posts.id = [cast].postId AND [cast].womanName IN (';
        var union = '';
        for (var i = 0; i < criteria.women.length; i++) {
          womenJoin += `
              ${union}SELECT '${criteria.women[i]}' UNION
              SELECT alias FROM aliases WHERE name = '${criteria.women[i]}' UNION
              SELECT name FROM aliases WHERE alias = '${criteria.women[i]}'
            `;
            union = 'UNION ';
        }
        womenJoin += ")";
      } else {
        for (var i = 0; i < criteria.women.length; i++) {
          womenJoin += `
            INNER JOIN [cast] AS cast_${i} ON posts.id = cast_${i}.postId AND cast_${i}.womanName IN (
              SELECT '${criteria.women[i]}' UNION
              SELECT alias FROM aliases WHERE name = '${criteria.women[i]}' UNION
              SELECT name FROM aliases WHERE alias = '${criteria.women[i]}'
            ) `;
        }
      }
    }
    var artistsJoin = '';
    if (criteria.artists && criteria.artists.length > 0) {
      if (criteria.artistsOr) {
        artistsJoin = 'INNER JOIN [work] ON posts.id = [work].postId AND [work].artistName IN (';
        var union = '';
        for (var i = 0; i < criteria.artists.length; i++) {
          artistsJoin += `
              ${union}SELECT '${criteria.artists[i]}' UNION
              SELECT alias FROM aliases WHERE name = '${criteria.artists[i]}' UNION
              SELECT name FROM aliases WHERE alias = '${criteria.artists[i]}'
            `;
            union = 'UNION ';
        }
        artistsJoin += ")";
      } else {
        for (var i = 0; i < criteria.artists.length; i++) {
          artistsJoin += `
            INNER JOIN [work] AS work_${i} ON posts.id = work_${i}.postId AND work_${i}.artistName IN (
              SELECT '${criteria.artists[i]}' UNION
              SELECT alias FROM aliases WHERE name = '${criteria.artists[i]}' UNION
              SELECT name FROM aliases WHERE alias = '${criteria.artists[i]}'
            ) `;
        }
      }
    }
    var tagsJoin = '';
    if (criteria.tags && criteria.tags.length > 0) {
      if (criteria.tagsOr) {
        tagsJoin = 'INNER JOIN [tagging] ON posts.id = [tagging].postId AND [tagging].tagName IN (';
        var comma = '';
        for (var i = 0; i < criteria.tags.length; i++) {
          tagsJoin += `${comma}'${criteria.tags[i]}'
            `;
            comma = ', ';
        }
        tagsJoin += ')';
      } else {
        for (var i = 0; i < criteria.tags.length; i++) {
          tagsJoin += `INNER JOIN v_tagging AS v_tagging_${i} ON posts.id = v_tagging_${i}.postId AND v_tagging_${i}.name = '${criteria.tags[i]}' `;
        }
      }
    }
    var albumJoin = '';
    if (criteria.album) {
      albumJoin += `INNER JOIN v_binding ON posts.id = v_binding.postId AND v_binding.name = '${criteria.album}' `;
    }
    var where = '';
    if (criteria.title) {
      where += ` AND a.title LIKE '%${criteria.title}%'`;
    }
    if (criteria.type) {
      where += ` AND a.type = '${criteria.type}'`;
    }
    console.log(criteria.love);
    if (criteria.love) {
      where += ` AND a.love = 1`;
    }
    if (criteria.keeping) {
      if (!criteria.discarded) {
        where += ` AND (a.discarded IS NULL OR a.discarded = 0)`;
      }
    } else {
      if (criteria.discarded) {
        where += ` AND (a.discarded = 1)`;
      } else {
        where += ` AND (1 = 0)`;
      }
    }
    var orderBy = 'updatedAt';
    if (criteria.orderBy) {
      orderBy = criteria.orderBy;
    }
    var ascending = "DESC";
    if (criteria.ascending) {
      ascending = "ASC";
    }
    var limit = criteria.limit;
    var sql = `
    SELECT
      a.*,
      b.women,
      e.artists,
      c.tags,
      d.albums,
      i.imageIds,
      m.movieUrls
     FROM (
      SELECT
        posts.*
      FROM posts
      ${womenJoin}
      ${artistsJoin}
      ${tagsJoin}
      ${albumJoin}
    ) a
    LEFT OUTER JOIN (
      SELECT
        postId,
        json_group_array(imageId) AS imageIds
      FROM (SELECT * FROM [images] ORDER BY [index]) AS [images]
      GROUP BY postId
    ) i ON a.id = i.postId
    LEFT OUTER JOIN (
      SELECT
        postId,
        json_group_array(url) AS movieUrls
      FROM [movies]
      GROUP BY postId
    ) m ON a.id = m.postId
    LEFT OUTER JOIN (
      SELECT
        postId,
        json_group_array(womanName) AS women
      FROM [cast]
      GROUP BY postId
    ) b ON a.id = b.postId
    LEFT OUTER JOIN (
      SELECT
        postId,
        json_group_array(artistName) AS artists
      FROM [work]
      GROUP BY postId
    ) e ON a.id = e.postId
    LEFT OUTER JOIN (
      SELECT
        postId,
        json_group_array(name) AS tags
      FROM v_tagging
      GROUP BY postId
    ) c ON a.id = c.postId
    LEFT OUTER JOIN (
      SELECT
        postId,
        json_group_array(name) AS albums
      FROM v_binding
      GROUP BY postId
    ) d ON a.id = d.postId
    WHERE 1 = 1 ${where}
    ORDER BY a.${orderBy} ${ascending}, a.title
    LIMIT ${limit}
    OFFSET ${lastVisibleCount}
    `;
    console.log(sql);
    let contents = sqldb.exec(sql);
    console.log(contents);
    if (contents[0]) {
      console.log(contents[0].values);
      callback(contents[0].values.map((p) => {
        return {
          id: p[0],
          title: p[1],
          type: p[2],
          movie: p[14]? JSON.parse(p[14])[0] : null,
          imageIds: JSON.parse(p[13]),
          cover: p[4],
          albums:JSON.parse(p[12]),
          women: JSON.parse(p[9]),
          artists: JSON.parse(p[10]),
          tags: JSON.parse(p[11]),
          love: p[3],
          comment: p[5],
          createdAt: p[7]? p[7] : null,
          updatedAt: p[8]? p[8] : null,
          discarded: p[6]
        }
      }));
    } else {
      callback([]);
    }
  }
  /*
  //console.log(criteria);
  if (lastVisibleCount == 0) {
    lastVisible = undefined;
  }
  var q = query(collection(db, 'posts'));
  if (criteria.title.length > 0) {
    q = query(q, orderBy('title'));
    q = query(q, startAt(criteria.title));
    q = query(q, endAt(criteria.title + '\uf8ff'));
  } else {
    if (criteria.ascending) {
      q = query(q, orderBy(criteria.orderBy));
    } else {
      q = query(q, orderBy(criteria.orderBy, 'desc'));
    }
  }
  if (criteria.type.length > 0) {
    q = query(q, where('type', '==', criteria.type));
  }
  if (criteria.keeping) {
    if (!criteria.discarded) {
      q = query(q, where('discarded', '==', false));
    }
  } else {
    if (criteria.discarded) {
      q = query(q, where('discarded', '==', true));
    } else {
    }
  }
  if (criteria.love) {
    q = query(q, where('love', '==', true));
  }
  // album, women, artists, tags are exclusive.
  if (criteria.album && criteria.album.length > 0) {
    q = query(q, where('albums', 'array-contains', criteria.album));
  } else if (criteria.women && criteria.women.length > 0) {
    //console.log(criteria.women);
    //console.log(criteria.aliases);
    q = query(q, where('women', 'array-contains-any', criteria.women.concat(criteria.aliases)));
  } else if (criteria.artists && criteria.artists.length > 0) {
    //console.log(criteria.artists);
    q = query(q, where('artists', 'array-contains-any', criteria.artists));
  } else if (criteria.tags && criteria.tags.length > 0) {
    //console.log(criteria.tags);
    // A maximum of 1 'ARRAY_CONTAINS' filter is allowed per disjunction.
    //for (var i = 0; i < criteria.tags.length; i++) {
    //  q = query(q, where('tags', 'array-contains', criteria.tags[i]));
    //}
    q = query(q, where('tags', 'array-contains-any', criteria.tags));
  }
  if (lastVisible) {
    q = query(q, startAfter(lastVisible), limit(criteria.limit));
  } else {
    q = query(q, limit(criteria.limit));
  }
  //console.log(q);
  try {
    var snapshot = await getDocs(q);
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    //console.log(snapshot);
    callback(snapshot.docs.map((p) => {
      //console.log(p.data());
      return {
        id: p.id,
        title: p.data().title,
        type: p.data().type,
        movie: p.data().movie,
        images: p.data().images,
        imageIds: p.data().imageIds,
        cover: p.data().cover,
        albums:p.data().albums,
        women: p.data().women,
        artists: p.data().artists,
        tags: p.data().tags,
        love: p.data().love,
        comment: p.data().comment,
        createdAt: p.data().createdAt? p.data().createdAt.toDate() : null,
        discarded: p.data().discarded
      }
    }));
  } catch (e) {
    console.log(e);
    alert(e);
  }
  */
}

async function getAllTypes() {
  var snapshot = await getDocs(query(collection(db, 'types'), orderBy('name')));
  return snapshot.docs.map((t) => {
    return {
      name: t.data().name
    };
  });
}

async function getAllAlbums() {
  var snapshot = await getDocs(query(collection(db, 'albums'), orderBy('name')));
  return snapshot.docs.map((a) => {
    return {
      name: a.data().name
    };
  });
}

async function getAllArtists() {
  var snapshot = await getDocs(query(collection(db, 'artists'), orderBy('yomi')));
  return snapshot.docs.map((a) => {
    return {
      name: a.data().name,
      yomi: a.data().yomi
    };
  });
}

async function getAllWomen() {
  var snapshot = await getDocs(query(collection(db, 'women'), orderBy('yomi')));
  return snapshot.docs.map((w) => {
    //console.log(w.data().name);
    return {
      name: w.data().name,
      yomi: w.data().yomi
    };
  });
}

async function getAllAliases() {
  var snapshot = await getDocs(query(collection(db, 'aliases'), orderBy('name')));
  return snapshot.docs.map((a) => {
    return {
      name: a.data().name,
      alias: a.data().alias
    };
  });
}

async function getAllTags() {
  var snapshot = await getDocs(query(collection(db, 'tags'), orderBy('yomi')));
  return snapshot.docs.map((t) => {
    console.log(t.id, t.data().name);
    return {
      name: t.data().name,
      yomi: t.data().yomi
    };
  });
}

async function savePost(post) {
  //console.log(post);
  var data = {
    title: post.title,
    type: post.type,
    movie: post.movie,
    images: post.images,
    imageIds: post.imageIds,
    cover: post.cover ? parseInt(post.cover) : 0,
    albums: post.albums,
    women: post.women,
    artists: post.artists,
    tags: post.tags,
    love: post.love,
    comment: post.comment,
    createdAt: post.createdAt ? post.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
    discarded: post.discarded ? true : false
  };
  if (!post.id) {
    return new Promise((resolve, reject) => {
      addDoc(collection(db, 'posts'), data)
        .then((docRef) => {
          //console.log(docRef.id);
          post.id = docRef.id;
          resolve(post)
        })
        .catch((error) => {
          reject(error);
        });
    });
  } else {
    return new Promise((resolve, reject) => {
      setDoc(doc(db, "posts", post.id), data)
        .then((docRef) => {
          resolve(post);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

async function saveWoman(woman) {
  await addDoc(collection(db, 'women'), {
    name: woman.name,
    yomi: woman.yomi
  });
}

async function saveArtist(artist) {
  await addDoc(collection(db, 'artists'), {
    name: artist.name,
    yomi: artist.yomi
  });
}

async function saveTag(tag) {
  await addDoc(collection(db, 'tags'), {
    name: tag.name,
    yomi: tag.yomi
  });
}