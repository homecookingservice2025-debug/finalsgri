import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://yawpvchmwmngjxnulzgn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "sb_publishable_8X9umrX5qfZ6ENFxNUIrpA_I64RsW8O";
const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = `
970			9838232206	16-11-2025			VILL.CHIRAIYA DAD THANA-SONHABASTI	Bankati		Basti				 

969			7081245389	15-11-2025			VIL-BARGADWA KALASANRKABIR NAGAR	Haisar Bazar		Sant Kabir Nagar				 

968			8419981295	17-11-2025			VILL-BARAHPUR SIDDHARTH NAGAR	Naugarh		Siddharthnagar				 

967			9628737633	16-11-2025			VILL- IMALIYA DEES THANA PAIKOLIYABASTI	Saltaua Gopalpur		Basti				 

966			9793132832	14-11-2025			VILL - KANAWALI BAHADURPUR BASTI	Bahadurpur		Basti				 

965			6392483819	15-11-2025			VILL- PINESAR THANA HARRAIYABASTI	Harraiya		Basti				 

964			7030580241	14-11-2025			VILL - MIRWAPUR THANA PATHARA BAZAR SIDDHARTAH NAGAR	Bansi		Siddharthnagar				 

963			7800613150	14-11-2025			VILL- MUGRAHA THANA- RUDHAULIBASTI	Rudhauli		Basti				 

962			7905254304	14-11-2025			VILL - KOOKNAGAR THANA KHODARE GONDA	Babhanjot		Gonda				 

961			9311438372	14-11-2025			VILL- TARAINI THANA GAURBASTI	Gaur		Basti				 

960			9761863389	13-11-2025			VILL-PENDA NANKAR BANSISIDDHARTH NAGAR	Bansi		Siddharthnagar				 

959			9919903537	12-11-2025			VILL-LAMTI THANA DUBAULIBASTI	Dubaulia		Basti				 

958			9889685212	12-11-2025			VILL-GAJPUR THANA -KHALILABAD SANT KBAIR NAGAR	Khalilabad		Sant Kabir Nagar				 

957			8795211317	12-11-2025			VILL.VEERPUR THANA-BHAWANIGANJSIDDHRTHNAGAR	Naugarh		Siddharthnagar				 

956			6306802552	12-11-2025			VILL - GANA THANA KALWARI BASTI	Bahadurpur		Basti				 

955			9277158220	11-11-2025			VILL-FARDA THANA LALGANJBASTI	Kaptanganj		Basti				 

954			7703063152	13-11-2025			VILL- GHATMAPUR THANA KAPTANGANJBASTI	Kaptanganj		Basti				 

953			9984644551	10-11-2025			VILL-KACHIYA THANA GAURBASTI	Gaur		Basti				 

952			9792097776	10-11-2025			VILL - PIPRA DAI THANA KHODARE GONDA	Babhanjot		Gonda				 

951			7379222441	10-11-2025			VILL.MOHNAKHOR THANA-MUNDERWABASTI	Ramnagar		Basti				 

950			7617099015	10-11-2025			VILL-MAGAIPUR THANA UTRAULABALRAMPUR	Utraula		Balrampur				 

949			7498407554	09-11-2025			VILL-RAMNAGAR THANA -SONHA BASTI	Bankati		Basti				 

948			9919953266	05-11-2025			VILL-TINICH BAZAR BASTI	Bankati		Basti				 

947			6394357149	03-11-2025			VILL - DEVAPAR THANA NAGAR BASTI	Basti Sadar		Basti				 

946			9565211534	06-11-2025			VILL- BHAISHAIYA KHURD BUJURGBASTI	Sau Ghat		Basti				 

945			8795440304	03-11-2025			VILL- BADHYA LALSINGH THANA SONHABASTI	Bankati		Basti				 

944			9648194272	02-11-2025			VILL-GANGAWAL THANA ITWASIDDHARTH NAGAR	Itwa		Siddharthnagar				 

943			8795301990	06-11-2025			VILL-MANSOOR NAGARBASTI	Basti Sadar		Basti				 

942			9936118900	05-11-2025			AVAS VIKAS CILONYBASTI	Basti Sadar		Basti				 

941			9792302221	04-11-2025			VILL-KATHAPUR THANA WALTERGANJBASTI	Sau Ghat		Basti				 

940			8787077731	01-11-2025			VILL - MUSHA THANA PAIKOLIYA BASTI	Saltaua Gopalpur		Basti				 

939			9118943659	01-11-0025			VILL- BALLIJOOT THANA ITWASIDDHARTHNAGAR	Itwa		Siddharthnagar				 

938			8090524351	31-10-2025			VILL- MANJHARIYA LUTAWAN THANA MUNDERWA BASTI	Ramnagar		Basti				 

937			9198995648	29-10-2025			VILL - BABHNAN THANA PAIKOLIYA BASTI	Saltaua Gopalpur		Basti				 

936			8840711123	29-10-2025			VILL- LEWDI THANA- TRILOKPUR SIDDHARTH NAGAR	Bansi		Siddharthnagar				 

935			9839282284	27-10-2025			VILL-BHAWANIGANJ SIDDHARTH NAGAR	Naugarh		Siddharthnagar				 

934			8787002046	26-10-2025			VILL-SUDIPUR THANA HARRAIYABASTI	Harraiya		Basti				 

933			8285800621	25-10-2025			VILL-KARANPUR BABHNANGONDA	Chhapia		Gonda				 

932			7571067560	25-10-2025			VILL- TURKAHIYA THANA KOTWALIBASTI	Basti Sadar		Basti				 

931			8795935755	25-10-2025			VILL-PIPRAHIYABASTI	Sau Ghat		Basti				 

930			9839025384	24-10-2025			VILL-SIYRAPARBASTI	Sau Ghat		Basti 

929			8817019511	22-10-2025			VILL - BAUHAN THANA KHODARE GONDA	Babhanjot		Gonda				 

928			9792754520	24-10-2025			VILL- BASKHANWA THANA SONHABASTI	Bankati		Basti				 

927			9554197337	24-10-2025			VILL-MADHWAPUR THANA -RUDHAULI BASTI	Rudhauli		Basti				 

926			8948726469	23-10-2025			HAVELI KHAS GANDHI NAGARBASTI	Basti Sadar		Basti				 

925			9455141253	24-10-2025			VILL-BELWA THAKURAISANTKABIR NAGAR	Haisar Bazar		Sant Kabir Nagar				 

924			8795433265	27-10-2025			VILL-RUDHAULI BASTI	Rudhauli		Basti				 

923			7318543418	22-10-2025			VILL-BASTI	Basti Sadar		Basti				 

922			8919921968	25-10-2025			VILL- PATHKAULI THANA PURANIBASTI	Sau Ghat		Basti				 

921			9670940351	21-10-2025			VILL-CHHITAHI MAHULI SANT KABIR NAGAR	Mehdawal		Sant Kabir Nagar				 

920			9918972927	18-10-2025			VILL-VISHAMBHAR CHAK BASTI	Sau Ghat		Basti				 

919			6386413171	20-10-2025			VILL - KATHAPUR THANA WALTERGANJ BASTI	Sau Ghat		Basti				 

918			9359242468	19-10-2025			VILL-KHAMRIYA THANA KHODRAE GONDA	Babhanjot		Gonda				 

917			7007794674	18-10-2025			VILL - SIDDHNATH THANA LALGANJ BASTI	Kaptanganj		Basti				 

916			8999739672	17-10-2025			VILL- SONARE DEEHA THANA- DUMARIYAGANJSIDDHARTH NAGAR	Domariyaganj		Siddharthnagar				 

915			9120516123	17-10-2025			VILL-NABABGANJ GONDA	Nawabganj		Gonda				 

914			6392793135	18-10-2025			VILL- DHORIKABASTI	Saltaua Gopalpur		Basti				 

913			8400732716	15-10-2025			VILL - PATHARA BAZAR SIDDHARTH NAGAR	Bansi		Siddharthnagar				 

912			7570004849	14-10-2025			BADEBANBASTI	Basti Sadar		Basti				 

911			9918897352	14-10-2025			VILL-GAUR BAZARBASTI	Gaur		Basti				 

910			8347476674	13-10-2025			VILL-DUBAULIYA BAZAR BASTI	Dubaulia		Basti				 

909			7311110112	16-10-2025			VILL-TURKAULIYA THANA-SONHABASTI	Bankati		Basti				 

908			7307243825	12-10-2025			VILL - KAKUA RAUT THANA KAPTANGANJ BASTI	Kaptanganj		Basti				 

907			6392036460	12-10-2025			VILL-KALIGARA THANA -KAPTANGANJ BASTI	Kaptanganj		Basti				 

906			9554613650	12-10-2025			VILL-RAM BARI THANA RUDHAULIBASTI	Rudhauli		Basti				 

905			6397107628	11-10-2025			VILL - BANKASHI THANA MUNDERWABASTI	Ramnagar		Basti				 

904			9336659731	11-10-2025			KATRA POKHRA SIDDHARTH NAGAR	Naugarh		Siddharthnagar				 

903			6390491743	14-10-2025			VILL - BISKOHAR TTHANA TRIKOLPUR SIDDHARTH NAGAR	Bansi		Siddharthnagar				 

902			8948812724	10-10-2025			VILL - MAHUWA THANA PATHARA BAZAR SIDDHARTH NAGAR	Bansi		Siddharthnagar				 

901			9559367618	10-10-2025			VILL- LAPSIBASTI	Sau Ghat		Basti				 

900			9792332418	10-10-2025			ADD-MADWA NAGAR BARGADWABASTI	Basti Sadar		Basti
`;

async function run() {
  const lines = rawData.trim().split('\n').filter(l => l.trim() !== '');
  const records = lines.map(line => {
    // Split by tabs or multiple spaces
    const parts = line.split(/\s{2,}|\t+/).map(p => p.trim()).filter(p => p !== '');
    
    // Pattern: [ID] [Phone] [Date] [Address] [Block] [District]
    // Example: 970 9838232206 16-11-2025 VILL.CHIRAIYA DAD THANA-SONHABASTI Bankati Basti
    
    const id = parts[0];
    const phone = parts[1];
    const date = parts[2];
    const address = parts[3] || '';
    const block = parts[4] || '';
    const district = parts[5] || '';

    return {
      name: `Patient ${id}`,
      phone: phone,
      village: address,
      block: block,
      district: district,
      type: 'Patient',
      created_at: new Date(date.split('-').reverse().join('-')).toISOString()
    };
  });

  console.log(`Processing ${records.length} records...`);

  const { data, error } = await supabase
    .from('hospital_entries')
    .insert(records);

  if (error) {
    console.error('Error inserting records:', error);
  } else {
    console.log('Successfully inserted records');
  }
}

run();
