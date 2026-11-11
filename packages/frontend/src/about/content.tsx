import {
  BlocksIcon,
  FactoryIcon,
  FingerprintIcon,
  FlaskConicalIcon,
  GlobeIcon,
  HashIcon,
  HourglassIcon,
  LockOpenIcon,
  UserCheckIcon,
  VenetianMaskIcon,
  VoteIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Code } from "./components/code";

/** Documentação oficial ou artigo de referência. Todos os links foram conferidos em 2026-11-09. */
export type DocLink = {
  label: string;
  href: string;
  /** Só para páginas em português; o resto da documentação é em inglês. */
  lang?: "pt-BR";
};

export type Technology = {
  /** Âncora do card (`/about#tlock`). */
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Como a tecnologia é usada neste projeto, em frases curtas. */
  points: ReactNode[];
  docs: DocLink[];
};

export type JourneyStep = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Atalhos para os cards que explicam a etapa. */
  topics: { label: string; target: Technology["id"] }[];
};

export const journey: JourneyStep[] = [
  {
    icon: UserCheckIcon,
    title: "Cadastro",
    description:
      "A autoridade autoriza a sua carteira. Você assina uma mensagem fixa, a assinatura vira a sua identidade Semaphore, e só o compromisso dela vai para a blockchain.",
    topics: [
      { label: "Identidade", target: "identidade" },
      { label: "Ethereum", target: "ethereum" },
    ],
  },
  {
    icon: FactoryIcon,
    title: "Criação da eleição",
    description:
      "A factory cria a eleição como um clone do contrato-modelo e congela nela a lista de eleitores daquele instante.",
    topics: [
      { label: "Factory e clones", target: "factory" },
      { label: "Árvore de Merkle", target: "identidade" },
    ],
  },
  {
    icon: VoteIcon,
    title: "Voto",
    description:
      "O navegador cifra a cédula até o fim da votação e prova, sem dizer quem você é, que você está na lista. O contrato guarda só o compromisso da cédula.",
    topics: [
      { label: "Prova ZK", target: "prova" },
      { label: "tlock", target: "tlock" },
      { label: "Commit-reveal", target: "commit-reveal" },
    ],
  },
  {
    icon: LockOpenIcon,
    title: "Apuração",
    description:
      "Quando o drand publica a rodada do fim, qualquer pessoa abre as cédulas e publica a contagem. O contrato confere cada uma contra o compromisso.",
    topics: [
      { label: "drand", target: "tlock" },
      { label: "Commit-reveal", target: "commit-reveal" },
      { label: "Eventos ao vivo", target: "navegador" },
    ],
  },
];

export const technologies: Technology[] = [
  {
    id: "ethereum",
    icon: BlocksIcon,
    title: "Ethereum e contratos inteligentes",
    description: "As regras da eleição e a contagem ficam na blockchain, à vista de todos.",
    points: [
      "Os contratos são escritos em Solidity e rodam na Sepolia, a rede de testes pública do Ethereum: as transações são reais, mas o ether dela não tem valor.",
      <>
        Modifiers barram a chamada antes de a função executar: <Code>onlyOwner</Code> (só a
        autoridade), <Code>onlyAuthorizedVoter</Code> (só carteiras autorizadas) e{" "}
        <Code>onlyInPhase</Code> (só na fase certa da eleição).
      </>,
      <>
        Cada passo emite um evento (<Code>VoterAuthorized</Code>, <Code>ElectionCreated</Code>,{" "}
        <Code>VoteCast</Code>, <Code>VoteRevealed</Code>…). A interface lê esses registros para
        montar as listas e acompanhar a apuração.
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
      {
        label: "Eventos e logs",
        href: "https://ethereum.org/pt-br/developers/docs/smart-contracts/anatomy/#events-and-logs",
        lang: "pt-BR",
      },
      {
        label: "Solidity: modificadores de função",
        href: "https://docs.soliditylang.org/en/latest/contracts.html#function-modifiers",
      },
      {
        label: "Solidity: eventos",
        href: "https://docs.soliditylang.org/en/latest/contracts.html#events",
      },
    ],
  },
  {
    id: "factory",
    icon: FactoryIcon,
    title: "Factory e clones (EIP-1167)",
    description: "Cada eleição é um contrato próprio, criado pela factory por pouco gás.",
    points: [
      <>
        O <Code>ElectionFactory</Code> cria cada eleição como um clone mínimo: um contrato de 45
        bytes que repassa toda chamada, por <Code>delegatecall</Code>, ao código de um{" "}
        <Code>Election</Code> implantado uma única vez.
      </>,
      <>
        Clones não rodam construtor. Por isso a factory chama <Code>initialize</Code> logo depois de
        criar o clone, e o <Code>Initializable</Code> da OpenZeppelin impede uma segunda chamada. É a
        factory chamando o contrato que acabou de criar.
      </>,
      <>
        A factory é <Code>Ownable</Code>: só a autoridade autoriza eleitores e cria eleições, e a
        posse não pode ser renunciada. Ela também marca os endereços que criou (
        <Code>isElection</Code>), e o app só confia nesses.
      </>,
    ],
    docs: [
      { label: "EIP-1167: Minimal Proxy Contract", href: "https://eips.ethereum.org/EIPS/eip-1167" },
      {
        label: "OpenZeppelin: Clones",
        href: "https://docs.openzeppelin.com/contracts/5.x/api/proxy#Clones",
      },
      {
        label: "OpenZeppelin: Initializable",
        href: "https://docs.openzeppelin.com/contracts/5.x/api/proxy#Initializable",
      },
      {
        label: "OpenZeppelin: Ownable",
        href: "https://docs.openzeppelin.com/contracts/5.x/api/access#Ownable",
      },
    ],
  },
  {
    id: "identidade",
    icon: FingerprintIcon,
    title: "Identidade anônima (Semaphore)",
    description: "O cadastro é público; o voto não aponta para nenhum cadastro.",
    points: [
      <>
        A identidade Semaphore é um par de chaves EdDSA na curva Baby Jubjub. No cadastro, vai para a
        blockchain só o compromisso, o hash Poseidon da chave pública, ligado à carteira (
        <Code>commitmentOf</Code>).
      </>,
      "A identidade nasce da assinatura da carteira sobre uma mensagem fixa, que inclui a rede e a factory (EIP-191). As carteiras assinam de forma determinística (RFC 6979): a mesma carteira recria sempre a mesma identidade, e nada fica salvo no navegador.",
      "Os compromissos formam o grupo de eleitores, uma árvore de Merkle incremental (LeanIMT) com hash Poseidon. Cada eleição congela a raiz da árvore no momento da criação: quem se cadastrar depois vota só nas próximas.",
    ],
    docs: [
      { label: "Semaphore: identidades", href: "https://docs.semaphore.pse.dev/guides/identities" },
      { label: "Semaphore: grupos", href: "https://docs.semaphore.pse.dev/guides/groups" },
      { label: "EIP-191: assinatura de dados", href: "https://eips.ethereum.org/EIPS/eip-191" },
      { label: "RFC 6979: ECDSA determinístico", href: "https://www.rfc-editor.org/rfc/rfc6979" },
      {
        label: "LeanIMT, a árvore do grupo",
        href: "https://github.com/zk-kit/zk-kit/tree/main/packages/lean-imt",
      },
      { label: "Poseidon (Grassi et al., 2019)", href: "https://eprint.iacr.org/2019/458" },
    ],
  },
  {
    id: "prova",
    icon: VenetianMaskIcon,
    title: "Prova de conhecimento zero",
    description: "Prova que você está na lista de eleitores sem dizer quem você é.",
    points: [
      <>
        Para votar, o navegador gera uma prova <span className="whitespace-nowrap">zk-SNARK</span>{" "}
        Groth16 com o snarkjs e os arquivos do circuito do Semaphore, baixados na hora. Ela mostra que
        quem vota conhece o segredo de uma das identidades da árvore congelada, sem revelar qual.
      </>,
      <>
        A prova traz um <em>nullifier</em>: o hash do segredo da identidade com o escopo, que aqui é o
        endereço da eleição. O mesmo eleitor gera sempre o mesmo nullifier nessa eleição, e o Semaphore
        recusa o repetido: um voto por pessoa.
      </>,
      <>
        A <em>mensagem</em> da prova é o hash do compromisso com a cédula cifrada. Quem repassar a
        transação não consegue trocar o voto sem invalidar a prova.
      </>,
      "O contrato da eleição confere a raiz, o escopo e a mensagem, e o Semaphore verifica a prova na própria blockchain.",
    ],
    docs: [
      {
        label: "Provas de conhecimento zero",
        href: "https://ethereum.org/pt-br/zero-knowledge-proofs/",
        lang: "pt-BR",
      },
      { label: "O que é o Semaphore", href: "https://docs.semaphore.pse.dev/" },
      { label: "Semaphore: provas", href: "https://docs.semaphore.pse.dev/guides/proofs" },
      {
        label: "Semaphore: o circuito",
        href: "https://docs.semaphore.pse.dev/technical-reference/circuits",
      },
      { label: "Groth16 (Groth, 2016)", href: "https://eprint.iacr.org/2016/260" },
      { label: "snarkjs", href: "https://github.com/iden3/snarkjs" },
    ],
  },
  {
    id: "commit-reveal",
    icon: HashIcon,
    title: "Commit-reveal",
    description: "O contrato só aceita a cédula que bate com o compromisso registrado.",
    points: [
      <>
        No voto, o navegador sorteia um salt de 32 bytes com o gerador criptográfico do navegador e
        registra só o compromisso <Code>keccak256(abi.encode(opção, salt))</Code>. Sem o salt, ninguém
        testa as opções uma a uma para descobrir o voto.
      </>,
      <>
        Na apuração, <Code>revealBatch</Code> recebe a opção e o salt de cada cédula e recalcula o
        hash. Se um deles não bater, o lote inteiro é recusado: ninguém inventa nem troca votos.
      </>,
      "Cédula já revelada é pulada, então várias pessoas podem apurar ao mesmo tempo sem contar nada duas vezes. Opção fora da lista de candidatos conta como voto nulo.",
    ],
    docs: [
      {
        label: "Esquema de compromisso",
        href: "https://en.wikipedia.org/wiki/Commitment_scheme",
      },
      {
        label: "Solidity: keccak256",
        href: "https://docs.soliditylang.org/en/latest/units-and-global-variables.html#mathematical-and-cryptographic-functions",
      },
      {
        label: "Solidity: codificação ABI",
        href: "https://docs.soliditylang.org/en/latest/abi-spec.html",
      },
      { label: "Keccak", href: "https://keccak.team/keccak.html" },
      {
        label: "crypto.getRandomValues()",
        href: "https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues",
      },
    ],
  },
  {
    id: "tlock",
    icon: HourglassIcon,
    title: "Cifra com prazo (tlock e drand)",
    description: "Ninguém abre as cédulas antes do fim da votação, nem a autoridade.",
    points: [
      "O drand é um farol público de aleatoriedade mantido pela League of Entropy. Na rede quicknet, os nós publicam a cada 3 segundos uma assinatura BLS de limiar sobre o número da rodada, e cada rodada corresponde a um horário.",
      "O tlock cifra a cédula para a rodada do fim da votação com criptografia baseada em identidade: o número da rodada faz o papel da chave pública, e a assinatura dessa rodada, quando sair, é a chave que decifra.",
      <>
        A cédula cifrada, no formato age, só aparece no evento <Code>VoteCast</Code>; o contrato
        guarda apenas o compromisso. Depois do fim, qualquer pessoa decifra as cédulas no próprio
        navegador, confere cada uma contra o compromisso e publica a apuração.
      </>,
      "Como qualquer um pode abrir, o eleitor não precisa voltar para revelar o voto, e ninguém consegue esconder a própria cédula para atrapalhar o resultado.",
    ],
    docs: [
      { label: "drand: visão geral", href: "https://docs.drand.love/docs/overview/" },
      {
        label: "drand: timelock encryption",
        href: "https://docs.drand.love/docs/timelock-encryption/",
      },
      {
        label: "A rede quicknet",
        href: "https://docs.drand.love/blog/2023/10/16/quicknet-is-live/",
      },
      {
        label: "tlock (Gailly, Melissaris e Romailler, 2023)",
        href: "https://eprint.iacr.org/2023/189",
      },
      { label: "tlock-js", href: "https://github.com/drand/tlock-js" },
      { label: "Formato age", href: "https://github.com/C2SP/C2SP/blob/main/age.md" },
    ],
  },
  {
    id: "navegador",
    icon: GlobeIcon,
    title: "Do navegador à blockchain",
    description: "Sem servidor do projeto no meio: o navegador fala direto com a rede.",
    points: [
      "A biblioteca viem lê os contratos por JSON-RPC, sem carteira: qualquer pessoa acompanha eleições e apuração. Leituras simultâneas viram uma só chamada ao contrato Multicall3.",
      <>
        Com WebSocket, a página da eleição assina os eventos do contrato (<Code>eth_subscribe</Code>)
        e atualiza a contagem e as cédulas assim que um voto ou uma apuração entra na blockchain, sem
        consultar a rede de tempos em tempos.
      </>,
      "As carteiras instaladas se anunciam pelo EIP-6963 e conversam pela interface padrão do EIP-1193. A carteira só assina: antes de abri-la, o app simula a transação, e um erro do contrato aparece em português.",
    ],
    docs: [
      { label: "viem", href: "https://viem.sh/docs/introduction" },
      {
        label: "viem: watchContractEvent",
        href: "https://viem.sh/docs/contract/watchContractEvent",
      },
      {
        label: "API JSON-RPC",
        href: "https://ethereum.org/pt-br/developers/docs/apis/json-rpc/",
        lang: "pt-BR",
      },
      {
        label: "Assinaturas em tempo real (eth_subscribe)",
        href: "https://geth.ethereum.org/docs/interacting-with-geth/rpc/pubsub",
      },
      { label: "EIP-1193: provedor Ethereum", href: "https://eips.ethereum.org/EIPS/eip-1193" },
      { label: "EIP-6963: descoberta de carteiras", href: "https://eips.ethereum.org/EIPS/eip-6963" },
      { label: "Multicall3", href: "https://www.multicall3.com/" },
    ],
  },
  {
    id: "testes",
    icon: FlaskConicalIcon,
    title: "Desenvolvimento e testes (Hardhat 3)",
    description: "Contratos testados em Solidity e em TypeScript, com a criptografia real.",
    points: [
      "Os testes unitários são em Solidity, com as cheatcodes do forge-std, contra um Semaphore simulado. Os de integração usam node:test e viem contra o Semaphore e o drand de verdade, com provas e cédulas reais.",
      <>
        A criptografia do voto mora num pacote único (<Code>shared/</Code>): o frontend monta a cédula
        com as mesmas funções que os testes validam contra o contrato.
      </>,
      "A implantação na Sepolia usa o Hardhat Ignition, que registra cada passo do deploy e retoma de onde parou se algo falhar.",
    ],
    docs: [
      { label: "Hardhat 3", href: "https://hardhat.org/docs/getting-started" },
      {
        label: "Hardhat: testes em Solidity",
        href: "https://hardhat.org/docs/guides/testing/using-solidity",
      },
      {
        label: "Hardhat: testes com viem e node:test",
        href: "https://hardhat.org/docs/guides/testing/using-viem",
      },
      { label: "Hardhat Ignition", href: "https://hardhat.org/ignition/docs/getting-started" },
      { label: "forge-std", href: "https://github.com/foundry-rs/forge-std" },
    ],
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
      "O contrato aceita o voto vindo de qualquer conta, mas esta interface ainda o envia pela carteira cadastrada. Quem observa a blockchain vê que aquela carteira registrou a cédula nº N e, depois da apuração, em quem ela votou. O anonimato do Semaphore só vale por inteiro quando outra conta, sem ligação com o eleitor, envia a transação (por exemplo, um relayer).",
  },
  {
    title: "Metadados ficam expostos.",
    description:
      "Pagar o gás e acessar o RPC deixam rastros, como a origem do saldo de uma conta e o endereço IP, que podem ligar uma pessoa a uma transação.",
  },
  {
    title: "Não há resistência à coerção.",
    description:
      "O eleitor consegue provar a alguém em quem votou, o que abre espaço para a compra de votos. Evitar isso exige um coordenador, como no MACI.",
    doc: { label: "MACI", href: "https://maci.pse.dev/" },
  },
  {
    title: "O sigilo até o fim confia no drand.",
    description:
      "Se um limiar de nós da League of Entropy agir em conjunto, consegue abrir as cédulas antes da hora; se a rede parar, as cédulas não abrem. A cifra também não resiste a computadores quânticos.",
    doc: {
      label: "Premissas de segurança do tlock",
      href: "https://docs.drand.love/docs/timelock-encryption/",
    },
  },
  {
    title: "A prova depende de uma cerimônia.",
    description:
      "O Groth16 exige uma configuração confiável (trusted setup) do circuito. A do Semaphore v4 foi feita numa cerimônia pública com vários participantes, e basta um deles ter descartado a sua parte do segredo.",
  },
  {
    title: "A autoridade decide quem se cadastra.",
    description:
      "Ela poderia autorizar carteiras fantasmas. Por isso as autorizações e o tamanho do grupo de eleitores são públicos, e qualquer pessoa pode auditá-los na blockchain.",
  },
  {
    title: "A assinatura da identidade vale como senha.",
    description:
      "Quem obtiver a sua assinatura da mensagem de cadastro recria a sua identidade e pode votar no seu lugar. Assine essa mensagem só neste site.",
  },
];
