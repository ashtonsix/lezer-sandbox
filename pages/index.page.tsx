import type {NextPage} from 'next'
import Head from 'next/head'
import Sandbox from './components/Sandbox'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Lezer Sandbox</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          max-width: 180ex;
          padding: 0 2em;
        }
        @media screen and (max-width: 600px) {
          .container {
            padding: 0 1em;
          }
        }
        .container :global(blockquote) {
          border-left: 4px solid #999;
          padding-left: 1em;
          margin: 1em 0;
        }
        footer {
          margin-top: auto;
          padding-top: 2em;
        }
      `}</style>

      <div className="container">
        <main>
          <Sandbox />
        </main>
        <footer>
          <hr />
          <p>Contact Information:</p>
          <p>me@ashtonsix.com</p>
        </footer>
      </div>
    </div>
  )
}

export default Home
