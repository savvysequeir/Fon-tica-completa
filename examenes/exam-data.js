(function () {
  "use strict";

  const sounds = {
    "/ɑː/": ["car","art","father","start","park","heart","dark","class","bath","calm","arm","star"],
    "/ɒ/": ["hot","dog","clock","box","stop","shop","lot","not","rock","watch","job","doctor"],
    "/e/": ["bed","pen","ten","head","said","friend","bread","red","desk","left","get","send"],
    "/æ/": ["cat","map","bag","hand","black","apple","hat","man","sad","flat","stamp","family"],
    "/ɜː/": ["bird","word","nurse","work","learn","turn","girl","first","shirt","world","earth","church"],
    "/iː/": ["see","green","week","seed","deep","teacher","eat","clean","key","machine","field","people"],
    "/ɪ/": ["sit","fish","milk","big","ship","live","give","busy","women","build","gym","pretty"],
    "/ɔː/": ["four","door","more","short","horse","talk","walk","ball","call","thought","bought","water"],
    "/ʌ/": ["cup","bus","sun","love","come","mother","money","young","country","enough","blood","lunch"],
    "/uː/": ["blue","food","moon","school","room","shoe","two","fruit","group","soup","move","true"],
    "/ʊ/": ["book","look","good","foot","cook","wood","full","push","pull","put","could","woman"],
    "/ə/": ["about","ago","teacher","doctor","banana","support","police","pencil","sofa","animal","today","problem"]
  };
  const soundKeys = Object.keys(sounds);

  const verbs = [
    ["accept","accepted"],["achieve","achieved"],["act","acted"],["add","added"],["admire","admired"],
    ["admit","admitted"],["advise","advised"],["afford","afforded"],["agree","agreed"],["allow","allowed"],
    ["answer","answered"],["appear","appeared"],["arrive","arrived"],["ask","asked"],["attract","attracted"],
    ["avoid","avoided"],["bake","baked"],["be","was/were"],["beat","beat"],["become","became"],
    ["begin","began"],["believe","believed"],["belong","belonged"],["bite","bit"],["blame","blamed"],
    ["bleed","bled"],["blow","blew"],["borrow","borrowed"],["bother","bothered"],["break","broke"],
    ["breathe","breathed"],["bring","brought"],["brush","brushed"],["build","built"],["burn","burnt"],
    ["buy","bought"],["call","called"],["camp","camped"],["can","could"],["care","cared"],
    ["carry","carried"],["catch","caught"],["cause","caused"],["celebrate","celebrated"],["change","changed"],
    ["chat","chatted"],["check","checked"],["choose","chose"],["clean","cleaned"],["clear","cleared"],
    ["climb","climbed"],["close","closed"],["collect","collected"],["come","came"],["compare","compared"],
    ["complain","complained"],["complete","completed"],["confirm","confirmed"],["connect","connected"],["consider","considered"],
    ["continue","continued"],["cook","cooked"],["copy","copied"],["correct","corrected"],["cost","cost"],
    ["count","counted"],["cover","covered"],["create","created"],["cross","crossed"],["cry","cried"],
    ["cut","cut"],["damage","damaged"],["dance","danced"],["decide","decided"],["deliver","delivered"],
    ["depend","depended"],["describe","described"],["design","designed"],["destroy","destroyed"],["develop","developed"],
    ["die","died"],["dig","dug"],["dirty","dirtied"],["discover","discovered"],["discuss","discussed"],
    ["dislike","disliked"],["divide","divided"],["do","did"],["download","downloaded"],["draw","drew"],
    ["dream","dreamt"],["dress","dressed"],["drink","drank"],["drive","drove"],["drop","dropped"],
    ["dry","dried"],["earn","earned"],["eat","ate"],["educate","educated"],["employ","employed"]
  ];

  const phrasals = [
    "wake up","get up","go to bed","put on","take off","wash up","clean up","tidy up","dress up","turn on",
    "turn off","switch on","switch off","plug in","blow out","sit down","stand up","look at","listen to","write down",
    "copy down","pick up","put down","open up","close up","hand in","hand out","cross out","rub out","fill in",
    "fill out","find out","go over","look up","think about","go in","go out","come in","come out","get in",
    "get out","get on","get off","go away","come back","go back","hurry up","slow down","speed up","run away",
    "walk away","move in","move out","check in","check out","set off","pull up","drive away","walk in","talk to",
    "speak up","call back","hang up","hold on","break up","get along","meet up","ask for","ask in","give back",
    "pay back","say sorry","cheer up","calm down","grow up","bring up","pass on","shut up","laugh at","look for",
    "give up","go on","carry on","keep on","come on","take out","put away","throw away","try on","show off",
    "watch out","look out","run out of","break down","fall down","turn up","turn down","bring back"
  ];

  const tenseNames = ["Present Continuous","Past Continuous","Future Continuous","Present Perfect","Past Perfect"];
  const baseSets = [
    {tense:"Present Continuous", positive:"The students are reviewing the lesson now.", negative:"The students are not reviewing the lesson now.", question:"Are the students reviewing the lesson now?"},
    {tense:"Past Continuous", positive:"María was answering the questions at eight.", negative:"María was not answering the questions at eight.", question:"Was María answering the questions at eight?"},
    {tense:"Future Continuous", positive:"We will be studying phonetics tomorrow morning.", negative:"We will not be studying phonetics tomorrow morning.", question:"Will we be studying phonetics tomorrow morning?"},
    {tense:"Present Perfect", positive:"They have completed the activity.", negative:"They have not completed the activity.", question:"Have they completed the activity?"},
    {tense:"Past Perfect", positive:"He had finished the exam before noon.", negative:"He had not finished the exam before noon.", question:"Had he finished the exam before noon?"},
    {tense:"Present Continuous", positive:"I am writing down the new words.", negative:"I am not writing down the new words.", question:"Am I writing down the new words?"},
    {tense:"Past Continuous", positive:"The teacher was speaking up during the presentation.", negative:"The teacher was not speaking up during the presentation.", question:"Was the teacher speaking up during the presentation?"},
    {tense:"Future Continuous", positive:"She will be cleaning up the laboratory later.", negative:"She will not be cleaning up the laboratory later.", question:"Will she be cleaning up the laboratory later?"},
    {tense:"Present Perfect", positive:"You have looked up the difficult terms.", negative:"You have not looked up the difficult terms.", question:"Have you looked up the difficult terms?"},
    {tense:"Past Perfect", positive:"The nurse had checked in before the meeting began.", negative:"The nurse had not checked in before the meeting began.", question:"Had the nurse checked in before the meeting began?"},
    {tense:"Present Continuous", positive:"Carlos is turning off the computer.", negative:"Carlos is not turning off the computer.", question:"Is Carlos turning off the computer?"},
    {tense:"Past Continuous", positive:"We were looking for the correct answer.", negative:"We were not looking for the correct answer.", question:"Were we looking for the correct answer?"},
    {tense:"Future Continuous", positive:"They will be handing in their projects next Friday.", negative:"They will not be handing in their projects next Friday.", question:"Will they be handing in their projects next Friday?"},
    {tense:"Present Perfect", positive:"Ana has brought back the library book.", negative:"Ana has not brought back the library book.", question:"Has Ana brought back the library book?"},
    {tense:"Past Perfect", positive:"I had put away the materials before class.", negative:"I had not put away the materials before class.", question:"Had I put away the materials before class?"}
  ];

  const translations = [
    ["Los estudiantes están aceptando las nuevas reglas.","The students are accepting the new rules.","Present Continuous","accept"],
    ["Ella estaba añadiendo los resultados.","She was adding the results.","Past Continuous","add"],
    ["Mañana estaremos celebrando nuestros logros.","Tomorrow we will be celebrating our achievements.","Future Continuous","celebrate"],
    ["Ellos han completado el proyecto.","They have completed the project.","Present Perfect","complete"],
    ["El docente había corregido los ejercicios.","The teacher had corrected the exercises.","Past Perfect","correct"],
    ["Estoy buscando una respuesta.","I am looking for an answer.","Present Continuous","look for"],
    ["Nosotros estábamos repasando la lección.","We were going over the lesson.","Past Continuous","go over"],
    ["Ella estará entregando los documentos.","She will be handing in the documents.","Future Continuous","hand in"],
    ["Él ha apagado la computadora.","He has turned off the computer.","Present Perfect","turn off"],
    ["Habían regresado antes de la lluvia.","They had come back before the rain.","Past Perfect","come back"],
    ["La universidad está desarrollando un nuevo programa.","The university is developing a new program.","Present Continuous","develop"],
    ["El estudiante estaba describiendo el procedimiento.","The student was describing the procedure.","Past Continuous","describe"],
    ["Estaremos comparando los resultados.","We will be comparing the results.","Future Continuous","compare"],
    ["Ella ha elegido la respuesta correcta.","She has chosen the correct answer.","Present Perfect","choose"],
    ["Yo había comprado los materiales.","I had bought the materials.","Past Perfect","buy"],
    ["Ellos están limpiando el aula.","They are cleaning up the classroom.","Present Continuous","clean up"],
    ["Él estaba anotando las palabras.","He was writing down the words.","Past Continuous","write down"],
    ["El avión estará despegando al mediodía.","The plane will be taking off at noon.","Future Continuous","take off"],
    ["Nosotros hemos averiguado la verdad.","We have found out the truth.","Present Perfect","find out"],
    ["Ella había devuelto el libro.","She had given back the book.","Past Perfect","give back"]
  ];

  function seeded(seed) {
    let value = seed * 9301 + 49297;
    return () => ((value = (value * 9301 + 49297) % 233280) / 233280);
  }
  function shuffle(items, seed) {
    const out = items.slice(), random = seeded(seed);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function rotate(items, amount) {
    const n = ((amount % items.length) + items.length) % items.length;
    return items.slice(n).concat(items.slice(0, n));
  }
  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9áéíóúüñ' ]/gi, " ").replace(/\s+/g, " ").trim();
  }
  function wordSound(word) {
    return soundKeys.find(sound => sounds[sound].includes(word));
  }

  function makeExam(version) {
    const v = Math.min(10, Math.max(1, Number(version) || 1));
    const rotatedSounds = rotate(soundKeys, v - 1);
    const phoneticChoice = rotatedSounds.map((sound, index) => {
      const correct = sounds[sound][(v + index) % sounds[sound].length];
      const distractors = [1, 4, 7].map(offset => {
        const other = rotatedSounds[(index + offset) % rotatedSounds.length];
        return sounds[other][(v * 2 + index + offset) % sounds[other].length];
      });
      return {sound, answer:correct, options:shuffle([correct].concat(distractors), v * 100 + index)};
    });
    const oddOneOut = rotatedSounds.slice(0, 10).map((sound, index) => {
      const group = rotate(sounds[sound], v + index).slice(0, 3);
      const other = rotatedSounds[(index + 5) % rotatedSounds.length];
      const odd = sounds[other][(v + index * 2) % sounds[other].length];
      return {sound, answer:odd, options:shuffle(group.concat(odd), v * 200 + index)};
    });
    const sortSounds = rotatedSounds.slice(0, 5);
    const sorting = shuffle(sortSounds.flatMap((sound, sIndex) =>
      rotate(sounds[sound], v + sIndex).slice(0, 4).map(word => ({word, sound}))
    ), v * 300);
    const listening = rotatedSounds.map((sound, index) => ({
      word:sounds[sound][(v * 3 + index) % sounds[sound].length], sound,
      options:shuffle([sound, rotatedSounds[(index + 2) % 12], rotatedSounds[(index + 5) % 12], rotatedSounds[(index + 8) % 12]], v * 400 + index)
    }));
    const patterns = rotatedSounds.slice(0, 5).map((sound, index) => {
      const words = rotate(sounds[sound], v + index).slice(0, 5);
      const wrongSound = rotatedSounds[(index + 6) % 12];
      const wrong = rotate(sounds[wrongSound], v + index).slice(0, 4);
      return {example:words[0], sound, answer:words.slice(1).join(", "), options:shuffle([words.slice(1).join(", "), wrong.join(", ")], v * 500 + index)};
    });

    const transforms = rotate(baseSets, v).slice(0, 10).map((item, index) => ({
      ...item,
      instruction:index % 2 === 0 ? "Pasa la oración a negativa" : "Pasa la oración a interrogativa",
      answer:index % 2 === 0 ? item.negative : item.question
    }));
    const ordering = rotate(baseSets, v * 2).slice(0, 10).map((item, index) => ({
      tense:item.tense, answer:item.positive, tokens:shuffle(item.positive.replace(/[.?]/g, "").split(" "), v * 600 + index)
    }));
    const dictation = rotate(baseSets, v * 3).slice(0, 15).map(item => ({tense:item.tense, answer:item.positive}));
    const translation = rotate(translations, v * 2).slice(0, 10).map(item => ({spanish:item[0], answer:item[1], tense:item[2], verb:item[3]}));
    const sentenceVerbs = rotate(verbs, (v - 1) * 10).slice(0, 5).map((verb, index) => ({
      verb:verb[0], past:verb[1], tense:tenseNames[index]
    }));
    const featuredPhrasals = rotate(phrasals, (v - 1) * 10).slice(0, 10);

    return {version:v, soundKeys, sounds, phoneticChoice, oddOneOut, sortSounds, sorting, listening, patterns,
      transforms, ordering, dictation, translation, sentenceVerbs, featuredPhrasals, normalize, wordSound};
  }

  window.AMINA_EXAM_DATA = {makeExam, sounds, soundKeys, verbs, phrasals, normalize};
})();
