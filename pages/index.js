import useSWR from 'swr';
import Link from 'next/link';
import { useUser } from '../utils/auth/useUser';
import { app, db, getCustomClaimRole } from '../utils/auth/initFirebase';
import getStripe from '../utils/auth/getStripe';

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

const Index = () => {
  const { user, logout } = useUser();

  const [products, setProducts] = React.useState([]);
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

            setProducts((p) => [
              ...p,
              {
                priceId,
                value: priceId,
                content,
              },
            ]);
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
  }, [setProducts, user, setMessage]);

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
      <>
        <p>Hi there!</p>
        <p>
          You are not signed in.{' '}
          <Link href={'/auth'}>
            <a>Sign ins</a>
          </Link>
        </p>
      </>
    );
  }
  if (isLoading) {
    return <div>Loading....</div>;
  }
  return (
    <div>
      <div>
        <p>You're signed in. Email: {user.email}</p>
        <p>{message}</p>
        <button onClick={goToBillingPortal}>Manage Subscription →</button>
        <p
          style={{
            display: 'inline-block',
            color: 'blue',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
          onClick={() => logout()}
        >
          Log out
        </p>
      </div>
      <div>
        <Link href={'/example'}>
          <a>Another example page</a>
        </Link>
      </div>
      {products &&
        products.map((p) => (
          <div key={p.productId + p.priceId}>
            {p.name} {p.content}
            <button onClick={() => subscribe(p.priceId)}>Subscribe</button>
          </div>
        ))}
    </div>
  );
};

export default Index;
