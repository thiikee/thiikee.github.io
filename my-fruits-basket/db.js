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
var lastVisible;

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