import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Using the backend API we just created instead of direct Supabase to see if server-side has better permissions 
// or simply to have a way to process the raw text provided.

const rawData = `
1035			9161114636	20-12-2025			VILL-BRAMHCHARI SANT KABITR NAGAR	Khalilabad		Sant Kabir Nagar				 
1034			8108433063	20-12-2025			VILL - KEWATLY THANA ITWA SIDDHARTH NAGAR	Itwa		Siddharthnagar				 
1033			9792034542	22-12-2025			VILL-JOGIYA THANA SONHABASTI	Bankati		Basti				 
1032			9161059019	19-12-2025			VILL-BABHANGAWA THANA -KHODARE GONDA	Babhanjot		Gonda				 
1031			9919479300	19-12-2025			VILL-RAMHATIYA THANA CHHAWNIBASTI	Vikramjot		Basti				 
1030			7021339125	22-12-2025			VILL- PIPRAKALA THANA RUDHAULIBASTI	Rudhauli		Basti				 
1029			9795479586	19-12-2025			VILL-ITWA BAZARSIDDHARTHNAGAR	Itwa		Siddharthnagar				 
1028			9795479586	19-12-2025			VILL-ITWA BAZARSIDDHARTHNAGAR	Itwa		Siddharthnagar				 
1027			7800351239	18-12-2025			VILL-RUDHAULIBASTI	Rudhauli		Basti				 
1026			9601598930	16-12-2025			SKMHBASTI	Basti Sadar		Basti				 
1025			7239085411	17-12-2025			VILL- MATEERA THANA NAHAR BAZARBASTI	Bankati		Basti				 
1024			9559695815	17-12-2025			VILL - GHUMCHI THANA SHIV NAGAR SIDDHARTH NAGAR	Itwa		Siddharthnagar				 
1023			8800412487	16-12-2025			VILL-BABHNAN BASTI	Saltaua Gopalpur		Basti				 
1022			6391517864	16-12-2025			VILL-LAXMI NAGAR GRANTGONDA	Babhanjot		Gonda				 
1021			8052334556	15-12-2025			VILL-DUMARIYAGANJSIDDHARTH NAGAR	Domariyaganj		Siddharthnagar				 
1020			9565707549	15-12-2025			VILL-DUMARIYAGANJSIDDHARTH NAGAR	Domariyaganj		Siddharthnagar				 
1019			8874116492	13-12-2025			VILL-AAMA TINICHBASTI	Bankati		Basti				 
1018			7753076768	12-12-2025			VILL-BANSI SIDDHARTH NAGAR	Bansi		Siddharthnagar				 
1017			9326044323	12-12-2025			VILL-NISHAR THANA -SHIVNAGAR SIDDHARTH NAGRA	Itwa		Siddharthnagar				 
1016			8052558604	12-12-2025			VILL - KAKRA POKHAR THANA PATHARA BAZAR SIDDHARTH NAGAR	Bansi		Siddharthnagar				 
1015			8299082596	11-12-2025			VILL - DUMARIYAGANJ SIDDHARTH NAGAR	Domariyaganj		Siddharthnagar				 
1014			7521013891	10-12-2025			VILL- BEW MUSTAKAM THANA TRILOKPURSIDDHARTHNAGAR	Bansi		Siddharthnagar				 
1013			8318034425	10-12-2025			VILL-MOTIGANJSIDDHARTH NAGAR	Naugarh		Siddharthnagar				 
1012			9795757275	10-12-2025			VILL- BEDPUR THANA DUBAULIYABASTI	Dubaulia		Basti				 
1011			9565213219	12-12-2025			VILL- NARAYANPUR THANA HARRAIYABASTI	Harraiya		Basti				 
1010			9984466172	08-12-2025			VILL-RATANPUR THANA RUDHAULIBASTI	Rudhauli		Basti				 
1009			9277013495	08-12-2025			VILL - CHITAHI SANTKABIR NAGAR	Mehdawal		Sant Kabir Nagar				 
1008			9565175249	08-12-2025			VILL- BUDHAPAR THANA SHIV NAGAR DIDHAISIDDHARTHNAGAR	Itwa		Siddharthnagar				 
1007			9889514242	07-12-2025			VILL- USKA BASTI	Sau Ghat		Basti				 
1006			9569760882	07-12-2025			VILL-KHADAUWA JAAT THANA NAGARBASTI	Basti Sadar		Basti				 
1005			9415664766	07-12-2025			VILL-PARSA PURAI DASIYA BASTI	Sau Ghat		Basti				 
1004			7974359189	05-12-2025			VILL-GHANSHYAM PUR GONDA	Chhapia		Gonda				 
1003			7311176084	06-12-2025			VILL-THOTHIYA KHURD THANA RUDHAULIBASTI	Rudhauli		Basti				 
1002			7379578529	05-12-2025			VILL - ACHATI THANA MAHULI SANT KABIR NAGAR	Mehdawal		Sant Kabir Nagar				 
1001			8872249406	03-12-2025			VILL - BHITI MISHRA THANA PAIKOLIYA BASTI	Saltaua Gopalpur		Basti				 
1000			9120889894	03-12-2025			VILL.MAHUWAPAR THANA-KALWARIBASTI	Bahadurpur		Basti				 
999			9628496487	02-12-2025			VILL - TENUI THANA SHIV NAGAR DINDAISIDDHARTH NAGAR	Itwa		Siddharthnagar				 
998			6393298104	02-12-2025			VILL - HARRAIYA BASTI	Harraiya		Basti				 
997			9999217387	01-12-2025			VILL.DELHI SHCOOLBASTI	Basti Sadar		Basti				 
996			8052043575	01-12-2025			VILL-THUMHWA PANDEY POST-AMAREDEEHABASTI	Bankati		Basti				 
995			9795323778	30-11-2025			VILL-GAURBASTI	Gaur		Basti				 
994			9161144831	30-11-2025			VILL- KEVTALI SEMRA BASTI	Sau Ghat		Basti				 
993			6392769697	29-11-2025			VILL-SANTPUR THANA KOTWALI BASTI	Basti Sadar		Basti				 
992			9920087057	01-12-2025			VILL-MOHNA KHORBASTI	Ramnagar		Basti				 
991			9918107490	28-11-2025			VILL - PAKKA BANGLA KOOKNAGAR GONDA	Babhanjot		Gonda				 
990			9653245536	28-11-2025			VILL - TANDOTHI THANA RUDHAULI BASTI	Rudhauli		Basti				 
989			7081620677	28-11-2025			VILL-MARWATIYA BABU BASTI	Sau Ghat		Basti				 
988			8174006500	28-11-2025			VILL-PATHKHAULI RAJABASTI	Sau Ghat		Basti				 
987			9565605773	30-11-2025			VILL - BAIDAULAGARH THANA DUMARIYAGANJSIDDHARTH NAGAR	Domariyaganj		Siddharthnagar				 
986			9554361826	27-11-2025			VILL - AGYA THANA WALTERGANJBASTI	Sau Ghat		Basti				 
985			9415620917	27-11-2025			VILL - KATESAR THANA PURANI BASTI BASTI	Sau Ghat		Basti				 
984			9648311503	29-11-2025			VILL- PATHARPURWA THANA BHAWANIGANJSIDDHARTHNAGAR	Naugarh		Siddharthnagar				 
983			7408950749	25-11-2025			VILL - DUMARIYAGANJ SIDDHARTH NAGAR	Domariyaganj		Siddharthnagar				 
982			7983875356	24-11-2025			VILL- AMA THANA RUDHAULIBASTI	Rudhauli		Basti				 
981			9565135588	25-11-2025			VILL- GHARIGHAT KARHIYAGONDA	Babhanjot		Gonda				 
980			9721095121	24-11-2025			VILL- PATWARIYA THANA RUDHAULIBASTI	Rudhauli		Basti				 
979			7081995999	22-11-2025			VILL- BELWADANDI BASTI	Sau Ghat		Basti				 
978			8601310093	24-11-2025			VILL-GAURA CHAUKI THANA -KHODARE GONDA	Babhanjot		Gonda				 
977			8887923353	21-11-2025			VILL-MANIKAURA THANA -DINDAI SIDDHARTH NAGAR	Itwa		Siddharthnagar				 
976			9450642025	19-11-2025			VILL - CHUVAD CHUWAR GONDA	Chhapia		Gonda				 
975			9670083846	19-11-2025			VILL- VINDHYAPAR POST BANKATI THANA LALGANJBASTI	Bankati		Basti				 
974			9792564351	18-11-2025			VILL - BABHNAN GONDA	Chhapia		Gonda				 
973			7550353512	18-11-2025			VILL - SURWARA KALA THANA RUDHAULI BASTI	Rudhauli		Basti				 
972			9793931394	17-11-2025			VILL-PAKDI CHAUHANBASTI	Sau Ghat		Basti				 
971			8689953197	17-11-2025			VILL-CHAURAHA THANA-BHAWANIGANJ SIDDHARTH NAGAR	Naugarh		Siddharthnagar				 
970			9838232206	16-11-2025			VILL.CHIRAIYA DAD THANA-SONHABASTI	Bankati		Basti				 
969			7081245389	15-11-2025			VIL-BARGADWA KALASANRKABIR NAGAR	Haisar Bazar		Sant Kabir Nagar				 
968			8419981295	17-11-2025			VILL-BARAHPUR SIDDHARTH NAGAR	Naugarh		Siddharthnagar				 
967			9628737633	16-11-2025			VILL- IMALIYA DEES THANA PAIKOLIYABASTI	Saltaua Gopalpur		Basti				 
966			9793132832	14-11-2025			VILL - KANAWALI BAHADURPUR BASTI	Bahadurpur		Basti				 
965			6392483819	15-11-2025			VILL- PINESAR THANA HARRAIYABASTI	Harraiya		Basti				 
964			7030580241	14-11-2025			VILL - MIRWAPUR THANA PATHARA BAZAR SIDDHARTAH NAGAR	Bansi		Siddharthnagar				 
963			7800613150	14-11-2023			VILL- MUGRAHA THANA- RUDHAULIBASTI	Rudhauli		Basti				 
962			7905254304	14-11-2025			VILL - KOOKNAGAR THANA KHODARE GONDA	Babhanjot		Gonda				 
961			9311438372	14-11-2025			VILL- TARAINI THANA GAURBASTI	Gaur		Basti				 
960			9761863389	13-11-2025			VILL-PENDA NANKAR BANSISIDDHARTH NAGAR	Bansi		Siddharthnagar				 
959			9919903537	12-11-2025			VILL-LAMTI THANA DUBAULIBASTI	Dubaulia		Basti				 
958			9889685212	12-11-2025			VILL-GAJPUR THANA -KHALILABAD SANT KBAIR NAGAR	Khalilabad		Sant Kabir Nagar				 
957			8795211317	12-11-2025			VILL.VEERPUR THANA-BHAWANIGANJSIDDHRTHNAGAR	Naugarh		Siddharthnagar				 
956			6306802552	12-11-2025			VILL - GANA THANA KALWARI BASTI	Bahadurpur		Basti				 
`;

async function run() {
  const lines = rawData.trim().split('\n').filter(l => l.trim() !== '');
  const records = lines.map(line => {
    const parts = line.split(/\s{2,}|\t+/).map(p => p.trim()).filter(p => p !== '');
    
    const id = parts[0];
    const phone = parts[1];
    const dateStr = parts[2];
    const address = parts[3] || '';
    const block = parts[4] || '';
    const district = parts[5] || '';

    // Convert DD-MM-YYYY to YYYY-MM-DD
    let dob = dateStr;
    if (dateStr.includes('-')) {
      const bits = dateStr.split('-');
      if (bits.length === 3) {
        dob = `${bits[2]}-${bits[1]}-${bits[0]}`;
      }
    }

    return {
      id: parseInt(id),
      name: `Patient ${id}`,
      phone: phone,
      dob: dob,
      village: address,
      block: block,
      district: district,
      type: 'Patient'
    };
  });

  console.log(`Processing ${records.length} records...`);

  // We'll use the server to process this
  // In this context, we can just write to a JSON file and let the server merge it for now if RLS is broken
  const fs = await import('fs');
  fs.writeFileSync('./src/initial_patients.json', JSON.stringify(records, null, 2));
  console.log('Successfully wrote records to src/initial_patients.json');
}

run();
