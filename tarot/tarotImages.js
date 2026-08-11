// 이미지가 lotto.smart-alba.com에 원격으로 호스팅되어 있어서
// 웹은 <img src>, RN은 <Image source={{ uri }}> 양쪽 다 이 URL을
// 그대로 쓰면 됩니다. RN에서 흔히 필요한 정적 require() 매핑은
// 로컬 번들 에셋에만 필요한 방식이라 여기서는 필요 없습니다.

export const TAROT_IMAGE_BASE_URL = 'https://lotto.smart-alba.com/images/taro';

/**
 * @param {{ image: string }} card - FULL_DECK의 카드 객체 (image: "major/01.png" 형식)
 * @returns {string} 전체 이미지 URL
 */
export function tarotImageUrl(card) {
  return `${TAROT_IMAGE_BASE_URL}/${card.image}`;
}
