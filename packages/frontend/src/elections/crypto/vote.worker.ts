import "./window-shim";
import { importGroup } from "@elections/shared/group";
import { importIdentity } from "@elections/shared/identity";
import { serveInWorker } from "@/lib/worker";
import { assembleVote, type VoteTask } from "./prepare-vote";

// identidade e árvore chegam exportadas (structured clone não leva instâncias de classe) e voltam a ser objetos aqui
serveInWorker(({ identity, group, election, option }: VoteTask) =>
  assembleVote({ identity: importIdentity(identity), group: importGroup(group), election, option }),
);
