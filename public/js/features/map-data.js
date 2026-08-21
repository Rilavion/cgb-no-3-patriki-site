window.CGB_MAP_DATA=(function(){
  var MAP_ID="1MFFCGSaHkdBKLyY05ARBrFdfsBPEt_LO";

  var CAT_ICONS={
    "ТЕРРИТОРИИ":"https://lh3.googleusercontent.com/d/1A_wmVcYxTUkPgPE-hLTcabrb6gsMsO3g=s128",
    "ТОЧКИ ПОСТАВОК":"https://lh3.googleusercontent.com/d/1eyODHPUZlKylFLUIPKZOaPOl55JiOT1h=s128",
    "ФРАКЦИИ.НАЛЁТЫ":"https://lh3.googleusercontent.com/d/1NV-jLTsxKm3Xvd5PbVDLZGHrZ8PuRCsg=s128",
    "СЕМЬЯ.НАЛЁТЫ":"https://lh3.googleusercontent.com/d/1NV-jLTsxKm3Xvd5PbVDLZGHrZ8PuRCsg=s128"
  };

  var CAT_COLORS={
    "БАЗЫ ГОС.СТРУКТУР":"#3498db",
    "ТОЧКИ ПОСТАВОК":"#e67e22",
    "ФРАКЦИИ.НАЛЁТЫ":"#e74c3c",
    "СЕМЬЯ.НАЛЁТЫ":"#9b59b6",
    "ТЕРРИТОРИИ":"#2ecc71"
  };

  var INFO_CATS=["БАЗЫ ГОС.СТРУКТУР","ТОЧКИ ПОСТАВОК"];

  var MARKERS=[
    {name:"Фсин",x:18.800,y:37.911,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1sRocaBxnUdi-anhXiaIdVbtrg6rHDcgp=s800",desc:"Федеральная служба исполнения наказаний. Главное исправительное учреждение Москвы. Здесь содержатся задержанные и осуждённые граждане. ФСИН отвечает за конвоирование, охрану периметра и контроль за отбыванием наказания.",icon:"https://lh3.googleusercontent.com/d/1HgGKtIwq9yAdpJORxi73gZN6mQ-gaeAe=s128"},
    {name:"ФС РФ Часть №1221",x:27.164,y:46.293,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1fojpNn0mNP33p2i2JxCA7Yt5jpvEMtXB=s800",desc:"Вооружённые силы Российской Федерации. Военная база, расположенная на окраине города. Является основным пунктом дислокации армейских подразделений.",icon:"https://lh3.googleusercontent.com/d/1GNXUwvEZpBAHhIZ6USjwGg3fOS3T_Px0=s128"},
    {name:"ЦГБ №3",x:85.239,y:10.087,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1j6OiflbpgJ4tCedXJFWqQLoIFqLiH9Is=s800",desc:"Центральная городская больница №3. Основное медицинское учреждение города. Врачи и фельдшеры оказывают экстренную помощь пострадавшим.",icon:"https://lh3.googleusercontent.com/d/1ZlmTEOSYf3ilEbQ07-snCOZjUnR6cILt=s128"},
    {name:"Правительство",x:82.053,y:16.556,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/12WWhOfeM3vf77XO8H30ZkjdNh7OVBbxT=s800",desc:"Правительство Москвы. Центральный орган исполнительной власти города. Здесь заседают чиновники, принимаются законы и указы.",icon:"https://lh3.googleusercontent.com/d/1zzFG10NJSJGR3u88W5UAyxFBmueFHdBp=s128"},
    {name:"ФСО",x:81.097,y:18.783,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/16aTz2VX1V9KpnADsgvbhH330JVzrYJj8=s800",desc:"Федеральная служба охраны. Элитное подразделение, отвечающее за безопасность высокопоставленных лиц и стратегически важных объектов.",icon:"https://lh3.googleusercontent.com/d/1juaKnEbdCNGNMj0mE6HfVa0bGjUN47yX=s128"},
    {name:"Суд",x:85.930,y:17.290,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1vLV6dJm0Afn_xgMIcUS46ukX7boMO6Xf=s800",desc:"Московский городской суд. Здание судебной власти, где рассматриваются уголовные и административные дела.",icon:"https://lh3.googleusercontent.com/d/1zzFG10NJSJGR3u88W5UAyxFBmueFHdBp=s128"},
    {name:"ФСБ",x:79.239,y:14.513,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1HguSp4GIrCnXhMEL9B3mxKzwju8TwoAB=s800",desc:"Федеральная служба безопасности. Главная спецслужба страны, занимающаяся контрразведкой, борьбой с организованной преступностью и терроризмом.",icon:"https://lh3.googleusercontent.com/d/1X31vB4fMVUsXWfZ69kWc9vNIlnQ0b7wm=s128"},
    {name:"ФСВНГ",x:65.113,y:7.153,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1j5lzqCCBt9un28Duesman6PqlvmI4xLT=s800",desc:"Федеральная служба войск национальной гвардии (Росгвардия). Силовое подразделение, обеспечивающее общественный порядок.",icon:"https://lh3.googleusercontent.com/d/132zE2yqZOv6iyeWJXUt5bAUSs9DXQdFY=s128"},
    {name:"Москва-Life",x:85.452,y:26.326,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1rL_lsHzDnpyA0y6LRG8Am4ASyTFPCYK3=s800",desc:"Городская медиаслужба. Официальное СМИ города Москвы. Журналисты освещают события и публикуют новости.",icon:"https://lh3.googleusercontent.com/d/13jo2VYZpCzxqaUDxWyIPPQeFg-7Ad-Wc=s128"},
    {name:"ГИБДД",x:82.717,y:31.198,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1ZG9H5ahkQ5vOkXTPcjYodlb93DJ7cLdY=s800",desc:"Государственная инспекция безопасности дорожного движения. Инспекторы патрулируют улицы, выписывают штрафы и задерживают нарушителей.",icon:"https://lh3.googleusercontent.com/d/1FYNMsLmWXs8Kn9LMSQtlMw5v8z9IHFiH=s128"},
    {name:"УВД",x:68.352,y:28.264,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1b4boEVJ0Gib7D35zO5IJWLHISwA44T0R=s800",desc:"Управление внутренних дел (Полиция). Основная правоохранительная структура города.",icon:"https://lh3.googleusercontent.com/d/1vqOnktred-Q-4hqMAcR_A2foUH-oP6Du=s128"},
    {name:"ЦОДД",x:71.087,y:15.823,cat:"БАЗЫ ГОС.СТРУКТУР",photo:"https://lh3.googleusercontent.com/d/1YFVEI_1j-fcD1JVXYzV0AI9fU9IuNXwF=s800",desc:"Центр организации дорожного движения. Управляет транспортной инфраструктурой города.",icon:"https://lh3.googleusercontent.com/d/13pf_11xmPw9pbKIYP2oXWPXjL_zjFfFk=s128"},

    {name:"Медицинские Склады",x:48.082,y:39.644,cat:"ТОЧКИ ПОСТАВОК",photo:"https://lh3.googleusercontent.com/d/12CqIYmWdpkqBv4o4Y0pVoeI0DFzcCzZx=s800",desc:"https://lh3.googleusercontent.com/d/12mMMKa4fQArMcWuSEQKpWBnMsnt-dho1=s800"},
    {name:"Центральные Медицинские Склады",x:30.977,y:30.510,cat:"ТОЧКИ ПОСТАВОК",photo:"https://lh3.googleusercontent.com/d/1BT24I1gSIf-ew6iUCSYJlt6aGibqAwiH=s800",desc:"https://lh3.googleusercontent.com/d/1xX_QHzhkfu-0fXsYBuH-Vo083EoHPO6P=s800"},
    {name:"Зарайское Медицинское Хранилище",x:20.374,y:50.137,cat:"ТОЧКИ ПОСТАВОК",photo:"https://lh3.googleusercontent.com/d/1OmexBlrtvmtFtWhiW-pQXug9EL8KIk2t=s800",desc:"https://lh3.googleusercontent.com/d/1A9vdJRHMSCzib88v6zvr2uqz5qO70yzw=s800"},
    {name:"Финансовая поставка",x:21.222,y:58.783,cat:"ТОЧКИ ПОСТАВОК",photo:"https://lh3.googleusercontent.com/d/14bnyGEyn_ExR_OuL8RarCKNR3q5EWPDU=s800",desc:"https://lh3.googleusercontent.com/d/1Zje1adNYRdd3GncTQ4UIRW_jjypHUC5d=s800"},
    {name:"Склады + Государственная Медицинская Поставка",x:50.299,y:66.253,cat:"ТОЧКИ ПОСТАВОК",photo:"https://lh3.googleusercontent.com/d/1-qmFiQLFMxtdm4K74TKWhNTh-1QYuK4X=s800",desc:"https://lh3.googleusercontent.com/d/12mMMKa4fQArMcWuSEQKpWBnMsnt-dho1=s800",desc2:"https://lh3.googleusercontent.com/d/1rrgm00r15ptU9Z7t0zsoymjOhF1JvzEs=s800"},
    {name:"Объект №7",x:57.143,y:55.478,cat:"ТОЧКИ ПОСТАВОК",photo:"https://lh3.googleusercontent.com/d/1wscYPVaGd9wVzaJb9VhDzzA4U329MQ0h=s800",desc:"https://lh3.googleusercontent.com/d/1KiGBTBeGPu1bQt4dFr-PzpFe5xsYlkB1=s800"},
    {name:"РЛС Орбита",x:30.341,y:21.167,cat:"ТОЧКИ ПОСТАВОК",photo:"https://lh3.googleusercontent.com/d/1SoTsxCDLioofcmeIFWP947-tlzEjUfVf=s800",desc:"https://lh3.googleusercontent.com/d/1q6pwmWok8EV_K3_KnlrA8FbeeHRQUfUm=s800"},

    {name:"Склад Шереметьево",x:11.784,y:5.274,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Терминал Шереметьево",x:18.626,y:15.820,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"ГК Солнышко",x:61.544,y:18.773,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Фармацевтический склад",x:47.705,y:35.876,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Строй Площадка \"Лавир\"",x:43.234,y:40.210,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Склад МеруаЛерлен",x:55.052,y:10.144,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Трубопровод МосЭнерго",x:60.791,y:39.942,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Склад НИИ ХимЗа",x:57.032,y:40.956,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Склад Коммерсов",x:43.185,y:47.929,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Заброшенная Мастерская",x:45.530,y:60.194,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Гараж СОБРа",x:71.136,y:50.591,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Рублевская Веб-Кам студия",x:73.100,y:73.318,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Хим.Лаборатория",x:51.994,y:74.614,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Шахта №3",x:32.010,y:85.263,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Заброшенная заправка",x:37.054,y:85.865,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Северный Схрон",x:42.998,y:85.389,cat:"ФРАКЦИИ.НАЛЁТЫ"},
    {name:"Хаб Сотовой Связи",x:48.813,y:85.516,cat:"ФРАКЦИИ.НАЛЁТЫ"},

    {name:"Склад Шереметьево (С)",x:10.373,y:11.813,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Топливный склад Шереметьево",x:18.142,y:8.298,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Схрон Лунных",x:64.933,y:35.006,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Промышленная стройка",x:55.995,y:45.263,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Гараж Самогонщика",x:49.745,y:39.645,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"ТЦ Рублёвское",x:71.738,y:68.572,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Фруктовый прилавок",x:57.631,y:68.457,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Дача Бабки Самогонщицы",x:19.223,y:75.199,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Заброшка у реки",x:36.163,y:75.199,cat:"СЕМЬЯ.НАЛЁТЫ"},
    {name:"Дом Рыбака",x:73.082,y:56.212,cat:"СЕМЬЯ.НАЛЁТЫ"},

    {name:"Сталинский дворик",x:10.601,y:16.759,cat:"ТЕРРИТОРИИ"},
    {name:"Речной порт",x:49.742,y:9.927,cat:"ТЕРРИТОРИИ"},
    {name:"Портовый",x:66.831,y:12.115,cat:"ТЕРРИТОРИИ"},
    {name:"Западный",x:55.917,y:37.443,cat:"ТЕРРИТОРИИ"},
    {name:"Бизнес-Академ",x:85.311,y:34.746,cat:"ТЕРРИТОРИИ"},
    {name:"Академический",x:86.533,y:44.882,cat:"ТЕРРИТОРИИ"},
    {name:"Индустриальный",x:57.139,y:45.170,cat:"ТЕРРИТОРИИ"},
    {name:"Трасса Москва-Зарайск",x:45.934,y:52.340,cat:"ТЕРРИТОРИИ"},
    {name:"Зарайск",x:20.640,y:52.711,cat:"ТЕРРИТОРИИ"},
    {name:"Недостроенный мост",x:43.743,y:76.983,cat:"ТЕРРИТОРИИ"},
    {name:"Нефтебаза Москвы",x:69.713,y:10.361,cat:"ТЕРРИТОРИИ"},
    {name:"Сухогруз \"Морской Ёж\"",x:68.023,y:13.552,cat:"ТЕРРИТОРИИ"},
    {name:"Точка МХФП Семашко",x:48.413,y:32.577,cat:"ТЕРРИТОРИИ"},
    {name:"НПЗ \"Лукоел\"",x:48.445,y:21.149,cat:"ТЕРРИТОРИИ"}
  ];

  return {MAP_ID:MAP_ID,CAT_ICONS:CAT_ICONS,CAT_COLORS:CAT_COLORS,INFO_CATS:INFO_CATS,MARKERS:MARKERS};
})();
