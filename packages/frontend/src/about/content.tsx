import { BlocksIcon, VenetianMaskIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Code } from "./components/code";

/** Documentação oficial ou artigo de referência. Todos os links foram conferidos em 2026-11-09. */
export type DocLink = {
  label: string;
  href: string;
  /** Só para páginas em português; o resto da documentação é em inglês. */
  lang?: "pt-BR";
};

/** Uma das duas tecnologias centrais do projeto, explicada em poucas frases. */
export type Technology = {
  /** Âncora do card (`/about#semaphore`). */
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Como a tecnologia é usada neste projeto, em frases curtas. */
  points: ReactNode[];
  docs: DocLink[];
};

export type JourneyStep = { title: string; description: string };

export const journey: JourneyStep[] = [
  {
    title: "Registro",
    description:
      "A autoridade autoriza a sua carteira, e você registra na blockchain o compromisso da sua identidade anônima.",
  },
  {
    title: "Criação da eleição",
    description:
      "A factory cria a eleição como um contrato próprio e congela nela a lista de eleitores daquele instante.",
  },
  {
    title: "Voto",
    description:
      "O navegador cifra a cédula até o fim da votação e prova, sem dizer quem você é, que você está na lista.",
  },
  {
    title: "Apuração",
    description:
      "Depois do fim, qualquer pessoa abre as cédulas e publica a contagem, que o contrato confere.",
  },
];

export const technologies: Technology[] = [
  {
    id: "ethereum",
    icon: BlocksIcon,
    title: "Ethereum",
    description: "As regras da eleição e a contagem ficam na blockchain, à vista de todos.",
    points: [
      "Os contratos são escritos em Solidity e rodam na Sepolia, a rede de testes pública do Ethereum: as transações são reais, mas o ether dela não tem valor.",
      <>
        O <Code>ElectionFactory</Code> cria cada eleição como um contrato próprio, um clone barato
        do <Code>Election</Code> (EIP-1167). Só a autoridade, dona da factory, autoriza eleitores e
        cria eleições.
      </>,
      <>
        Cada passo emite um evento, como <Code>VoteCast</Code> e <Code>VoteRevealed</Code>. O
        navegador lê esses registros direto da rede, sem servidor do projeto no meio, e qualquer
        pessoa confere a apuração.
      </>,
    ],
    docs: [
      {
        label: "Contratos inteligentes",
        href: "https://ethereum.org/pt-br/developers/docs/smart-contracts/",
        lang: "pt-BR",
      },
      {
        label: "Redes de teste: Sepolia",
        href: "https://ethereum.org/pt-br/developers/docs/networks/#sepolia",
        lang: "pt-BR",
      },
      { label: "EIP-1167: Minimal Proxy Contract", href: "https://eips.ethereum.org/EIPS/eip-1167" },
    ],
  },
  {
    id: "semaphore",
    icon: VenetianMaskIcon,
    title: "Semaphore Protocol",
    description: "Prova que você está na lista de eleitores sem dizer quem você é.",
    points: [
      "No registro, a assinatura da sua carteira vira uma identidade Semaphore. Só o compromisso dela, um hash, vai para a blockchain e entra no grupo de eleitores, uma árvore de Merkle.",
      <>
        Para votar, o navegador gera uma prova de conhecimento zero{" "}
        <span className="whitespace-nowrap">(zk-SNARK)</span>: ela mostra que quem vota conhece o
        segredo de uma das identidades do grupo, sem revelar qual.
      </>,
      <>
        A prova traz um <em>nullifier</em>, que é sempre o mesmo para o mesmo eleitor na mesma
        eleição. O Semaphore recusa o repetido: um voto por pessoa.
      </>,
    ],
    docs: [
      { label: "O que é o Semaphore", href: "https://docs.semaphore.pse.dev/" },
      { label: "Semaphore: identidades", href: "https://docs.semaphore.pse.dev/guides/identities" },
      { label: "Semaphore: provas", href: "https://docs.semaphore.pse.dev/guides/proofs" },
      {
        label: "Provas de conhecimento zero",
        href: "https://ethereum.org/pt-br/zero-knowledge-proofs/",
        lang: "pt-BR",
      },
    ],
  },
];

/** O resto da pilha, em uma linha cada: o que faz aqui e onde ler mais. */
export type SupportingTool = { title: string; description: string; doc: DocLink };

export const supportingTools: SupportingTool[] = [
  {
    title: "Commit-reveal",
    description:
      "O contrato guarda só o hash da cédula e, na apuração, aceita apenas a cédula que bate com ele.",
    doc: {
      label: "Solidity: keccak256",
      href: "https://docs.soliditylang.org/en/latest/units-and-global-variables.html#mathematical-and-cryptographic-functions",
    },
  },
  {
    title: "tlock e drand",
    description:
      "A cédula é cifrada para o instante do fim da votação: antes disso ninguém a abre, nem a autoridade.",
    doc: {
      label: "drand: timelock encryption",
      href: "https://docs.drand.love/docs/timelock-encryption/",
    },
  },
  {
    title: "viem",
    description: "A biblioteca com que o navegador lê os contratos e envia as transações.",
    doc: { label: "viem", href: "https://viem.sh/docs/introduction" },
  },
  {
    title: "Hardhat 3",
    description: "Compila, testa e implanta os contratos, com testes em Solidity e em TypeScript.",
    doc: { label: "Hardhat 3", href: "https://hardhat.org/docs/getting-started" },
  },
];

export type Limitation = {
  title: string;
  description: string;
  doc?: DocLink;
};

/** O que o sigilo não cobre e em que ele confia: melhor mostrar as fronteiras do que escondê-las. */
export const limitations: Limitation[] = [
  {
    title: "O voto sai da carteira do eleitor.",
    description:
      "Quem observa a blockchain vê qual carteira enviou cada cédula e, depois da apuração, em quem ela votou. O anonimato só vale por inteiro se outra conta enviar a transação.",
  },
  {
    title: "Não há resistência à coerção.",
    description: "O eleitor consegue provar a alguém em quem votou, o que abre espaço para a compra de votos.",
    doc: { label: "MACI", href: "https://maci.pse.dev/" },
  },
  {
    title: "O sigilo até o fim confia no drand.",
    description:
      "Se um limiar de nós da rede agir em conjunto, consegue abrir as cédulas antes da hora.",
  },
];
