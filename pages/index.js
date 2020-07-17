import useSWR from 'swr';
import Link from 'next/link';
import { useUser } from '../utils/auth/useUser';
import { app, db, getCustomClaimRole } from '../utils/auth/initFirebase';
import getStripe from '../utils/getStripe';

const fetcher = (url, token) =>
  fetch(url, {
    method: 'GET',
    headers: new Headers({ 'Content-Type': 'application/json', token }),
    credentials: 'same-origin',
  }).then((res) => res.json());

async function getProducts() {
  return await db()
    .collection('product')
    .where('active', '==', true)
    .get()
    .then(unwrapCollection);
}

function unwrapCollection(collection) {
  const arr = [];
  collection.forEach((doc) => arr.push(unwrapDoc(doc)));
  return arr;
}

function unwrapDoc(doc) {
  console.log(doc.data());
  return {
    ...doc.data(),
    id: doc.id,
  };
}

const Index = () => {
  const { user, logout } = useUser();

  const [products, setProducts] = React.useState([]);
  const [basicContent, setBasicContent] = React.useState([]);
  const [premiumContent, setPremiumContent] = React.useState([]);
  const [message, setMessage] = React.useState();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      return;
    }
    db()
      .collection('product')
      .where('active', '==', true)
      .get()
      .then(async function (querySnapshot) {
        querySnapshot.forEach(async function (productDoc) {
          console.log(productDoc.id, ' => ', productDoc.data());
          const product = productDoc.data();
          const priceSnap = await productDoc.ref
            .collection('prices')
            .orderBy('unit_amount')
            .get();

          priceSnap.forEach(async (doc) => {
            console.log(doc.id, ' => ', doc.data());
            const priceId = doc.id;
            const priceData = doc.data();
            const content = `${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: priceData.currency,
            }).format((priceData.unit_amount / 100).toFixed(2))} per ${
              priceData.interval
            }`;
            if (!message) {
              setProducts((p) => [
                ...p,
                {
                  priceId,
                  value: priceId,
                  content,
                },
              ]);
            }
          });
        });
      });

    db()
      .collection('customer')
      .doc(user.id)
      .collection('subscriptions')
      .where('status', '==', 'active')
      .onSnapshot(async (snapshot) => {
        if (snapshot.empty) {
          return;
        }
        const subscription = snapshot.docs[0].data();
        const priceData = (await subscription.price.get()).data();
        const msg = `You are paying ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: priceData.currency,
        }).format((priceData.unit_amount / 100).toFixed(2))} per ${
          priceData.interval
        }, giving you the role: ${await getCustomClaimRole()}. 🥳`;

        setMessage(msg);
      });

    db()
      .collection('content-basic')
      .get()
      .then(unwrapCollection)
      .then(
        (content) => setBasicContent(content),
        (e) => console.log(e)
      );

    db()
      .collection('content-premium')
      .get()
      .then(unwrapCollection)
      .then(
        (content) => setPremiumContent(content),
        (e) => console.log(e)
      );
  }, [setProducts, user, setMessage, setPremiumContent, setBasicContent]);

  const goToBillingPortal = async () => {
    // Call billing portal function
    setIsLoading(true);
    const functionRef = app()
      .functions('us-central1')
      .httpsCallable('ext-firestore-stripe-subscriptions-createPortalLink');
    const { data } = await functionRef({ returnUrl: window.location.origin });
    window.location.assign(data.url);
  };

  const subscribe = async (priceId) => {
    setIsLoading(true);
    const thing = await db()
      .collection('customer')
      .doc(user.id)
      .collection('checkout_sessions')
      .add({
        price: priceId,
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      });

    thing.onSnapshot(async (snap) => {
      const { sessionId } = snap.data();
      if (sessionId) {
        // We have a session, let's redirect to Checkout
        // Init Stripe
        const stripe = await getStripe();
        stripe.redirectToCheckout({ sessionId });
      }
    });
  };
  if (!user) {
    return (
      <div className="mx-auto max-w-xl my-4 bg-white">
        <div className="shadow-md rounded-lg">
          <div className="shadow-xs rounded-lg p-4 space-y-4">
            <p>Hi there!</p>
            <p>You are not signed in. </p>{' '}
            <div>
              <Link href={'/auth'}>
                <a className="px-4  py-2 bg-gray-300 rounded-md text-gray-900 font-medium  hover:bg-gray-400 transition duration-150 ease-in active:bg-gray-400">
                  Sign in
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl flex items-center justify-center py-8">
        <div>Loading....</div>
      </div>
    );
  }
  return (
    <div>
      <div className="mx-auto max-w-xl flex items-center justify-between py-2">
        <div className="space-x-3">
          <Link href={'/'}>
            <a>Home</a>
          </Link>
          <Link href={'/example'}>
            <a>Another Page</a>
          </Link>
        </div>
        <div className="flex items-center space-x-3">
          <p className="text-sm">
            <strong>{user.email}</strong>
          </p>
          <button
            className="px-3 py-1 bg-gray-300 rounded-md text-gray-900 font-medium  hover:bg-gray-400 transition duration-150 ease-in active:bg-gray-400"
            onClick={() => logout()}
          >
            Log out
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-xl my-4  space-y-4">
        <div className="shadow-md rounded-lg bg-white">
          <div className="shadow-xs rounded-lg p-4 space-y-4">
            <div className="space-y-4">
              <p>You're signed in.</p>
              <p>{message}</p>

              <div className="space-x-3">
                <button
                  className="px-5 py-3 bg-blue-200 rounded-md text-blue-900 font-medium hover:bg-blue-300 transition duration-150 ease-in active:bg-blue-300"
                  onClick={goToBillingPortal}
                >
                  Manage Subscription →
                </button>
              </div>
            </div>

            {!message &&
              products &&
              products.map((p) => (
                <div key={p.productId + p.priceId}>
                  {p.name} {p.content}
                  <button onClick={() => subscribe(p.priceId)}>
                    Subscribe
                  </button>
                </div>
              ))}
          </div>
        </div>
        <div className="shadow-md rounded-lg bg-white">
          <div className="shadow-xs rounded-lg p-4 space-y-4">
            <strong>Basic Content</strong>
            <pre>{JSON.stringify(basicContent, null, 2)}</pre>
          </div>
        </div>
        <div className="shadow-md rounded-lg bg-white">
          <div className="shadow-xs rounded-lg p-4 space-y-4">
            <strong>Premium Content</strong>
            <pre>{JSON.stringify(premiumContent, null, 2)}</pre>
          </div>
        </div>
      </div>{' '}
    </div>
  );
};

export default Index;
