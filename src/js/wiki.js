/**
 * League of Customs - Hextech Wiki Controller
 * Comprehensive encyclopedic browser for Champions, Items, and Runes.
 */

const WIKI_STATE = {
  currentSubTab: 'champions',
  patch: (typeof LOL_DATA !== 'undefined' && LOL_DATA.version) ? LOL_DATA.version : '16.18.1',
  champions: [],
  championsMap: {},
  champDetailCache: {},
  items: [],
  itemsMap: {},
  runes: [],
  runesMap: {},
  champFilters: {
    search: '',
    role: 'all',
    lane: 'all',
    sort: 'name'
  },
  itemFilters: {
    search: '',
    roleClass: 'all',
    tier: 'all',
    stat: 'all',
    map: 'rift',
    sort: 'shop-order',
    viewMode: 'columns'
  },
  activeRunePathId: 8000, // Default to Precision
  activeChampModalId: null,
  activeItemModalId: null,
  initialized: false
};

const STAT_ICONS = {
  armor: `<img class="stat-ico" src="data:image/png;base64,UklGRtACAABXRUJQVlA4TMQCAAAvR8AREO+jqG0jyXM8lz+YBTelgbZt21D9/9rurR20keRI7r18MA7V82cRtx03kqRI3TNzjE9GQ8/MswFfTNNZ8e9L2LTNzSEYnHoZAREIhSEgIgQBQi0REr4AQAQAIAhAEECgIiAEgoIXTQEEhB8tSPKlNQOFCoAo9CdQKywalACgwhGQVCSGwU0mqcJhPlHFDEyrlLZeSZYoxUabYSjETC5EssMo1noaZe5YJ0jwigAZo4G+aSKNs0keUKHIGzeIvugD0H/MT2plPk2Zjtn13r/3LHb3ALIlyTZta9SxcW3btsfBtW3bZv/8uXPMudY+1/chov8T8O3FOPn1hY2Tr/8CaH/ViNOLvFIj0jde6OkfpS8fa9hUj49Ww6P/A3iZmk7ieB2OJehLffaUecJr0EfiiKW9BI+re6bk2Wrk1R1MsKtMDwkeVjWFhFuERSnzhLyqdypwE70JXEyxrpqWptS5wBXpVGAlCXk1Z5RkSeCy5AHzFPurWEzKLegS2wILSIh95W6j9KfAIJJOBexaShxeVWg5StMbGJIkugLNpCQ+dBdod5Rmv6VbGSMP2EwCEl1ZW1D0hgXf6rtMD9h2IuLUrNBmR1FmRfx7uhCxfUQkFqfmnUJhHlhwLQm6InaCkPD2MZ2O4sy3qCs9FLIdhCROPXl+CGUyx6LbCbAmZLuJFWWeRSegKDNCNpVq8LkW7UTxoZg9vkoFbLH4J2VyMma2fohCXBqw+GpyxP4Ms5VOAbzVMpeifPblmO0lh9PTLHcFKsmeLJt9nQg+0bLXorLsyzLrcxJstfw7qDTelmW2zpHwd82WfwdVyIY8s1vuS61gxwFUKd6fV/g+qpzznTWY7KiO7Kjq3iiqKf6pr4K7Q6jObCz1yFHNGZleYuFx1IAcWpazbhg1KP4oMuiogRmalDiJGpydYzY5anj83XtH1QM=" alt="ARMOR" />`,
  mr: `<img class="stat-ico" src="data:image/png;base64,UklGRgAEAABXRUJQVlA4TPQDAAAvR8AREGdkkG2kzh/yTf40HLWNJEhOa4/g8Yex37tC0LZtvP3nz/hxI0mSo/TMnBYm0iL4DA/h02fjay12u+O+CZs+bP1JUSSEQAVQAEEiCATF8SMIIVAIgRCEHySOgCHguID4QxCIDBlAIIRkAENCZswQCYKotHkaQQxMBg1AQ5AKx1AwkwGT/TFg+MCfyDI0HDBoyMIQazHy4TVQ7gS5ACa2hTiI7/IeVWAKp+jEUtFf3GlUlHIKjZWKsqo1LWKCdOhQFiEh422IhBGzvSfjmLH29v/awfb7uccWtG1bMmxbMY5Zx7Zt27Yqjm3btuKrV2Yk9sVrRP8nwEqiql/eRj+rKtYF0fb5MEme8FyVurh6RbJfOUg96FApOkqpg33Tpfj0P5Rj9zepcuE1CnFBqj1FERqpeDwFujVS9Whyof0k4+TX0ckZZISShVWSvk4Vi6K6KElkMxlYI6kz9yqWiO4ZlyJ3MrSSuFyxrOyZkdCLJBpfo1h2tJdLxpNAI+6/WFG2umQqLi6Id+ItrDAbXXIOz27xTsHKo4M80jr45pmCuVG99/nz5883VPGYdRvimUeE2eKciDlp748X55z7isPUI+sJqXhvWRxdLsnbcLDGIxpgmecvMU5Lzh5KxFjhuRtoxdlgUdZK5jVE7LdnEB3XPWpRZkj2xUQ46ZDWzJjiWE6EGVJwLiFjpGMmZipOtTBrpegFQnbYIWr2yDGTEKel8IkIoxw3je+OvRZWKd2TkD11bEHFqSGWF5O7kdYh6llHqJXyfQlpJrXw/QrkUIjznndpjK9hDgHb73j5NjaZkEqVGjrgeOV4bV2B5p/Cvv5fofmnaCXHZLrCfs+zmGjXeqBprK7hAmmawe7UcMSCbMgzhpBW0BBSySMaYni5T5bWHb47boZMy2mIpY7bZs8dOwixvtR2Qio+dYiGTAsNwDJowmxC/OpeYmA3CzPG0QczLjtEQ2b0zDcYi6o4WzMz+jpmETHNNhCLMtExlg5745CjMU5lGtDNoqwU5wsLqmf9z4ihm3Jsx+IqXg0x3SGLiJih7xtf80mxOL09awjZH4+sJmZmHFofu3AE87JYnP27WZSdHtmFxwyNYm6WiPe4OdUlm3FlZrF4h+DhlEvGt5Th0Hhxt+bmr0vkLCW4KP4z+IzRPlmgZGOi+GdiqYzwiUwkDx9GiH8Sls6UBBn19KHiQ588HSCJP7CcTEvoPL9//1E6OLp//3lJ/4HlZURaZ/P169evjWSdhOVmfJaCM7H8XKrpDFaSA0NqGdJihZlfx3qsPMfWlFvTYlWiH8eWGPtCsXo5la1Pi9WNtre3JHW/fVuxroiq6uNXwQeqihUF" alt="MR" />`,
  mpen: `<img class="stat-ico" src="data:image/png;base64,UklGRowEAABXRUJQVlA4TH8EAAAvR8AREFflqI0kSXL2zgJZeMv/dQcNB20jSZIz+xx/Ygdpi0HbNoKce/5MH8MKOQDbRJKkLPO+mL7YfzlbAx5mpHj+FxyxwWVoKAc4MItVdmhowCByQtEAxGAwpGkAIh8EMoQYDkKLYQIaKWD8I1ROa81aaA00lcrp2hNsWvpLe4h1Zw1GAzJAa/xh3kCG1DTTEPj6vkcABYTwhYog+IdhVARBYARBUMMwOmjTDwwjQRYD+o9fodVEZYkQDCDmMAEOk+EAg+UwISqCRAhw5GqDtQ7o2/3WbtexsitL568dhEIEbQoSoRAIggEQAgkRyAAMgmAAJIAR3ukeXgcfv38BiratHZKke+Zr27Y5nrZt27Zt27bd/T1mRnzxR8wLRPR/ArxkLIj/X7HOw4ffUPDG8OHNjOrR7oCSHm5LpbDRL5T8xUijKtgclTzXqAItVquC2xpRGjNV0QWUQ5+bquyUK5TAQVX6KMk4q4pfIBHTlPC+Bd8kkKXhsYo+6tHI8CDWosfHAkdIwnMVnNsVT8iguZE9eEoOKv7R8MTU+ZhzCE/JHoVft8VL5HjGCTypKfwEL5dzkvbhSZkZ2o+XjU3ojiflqqIn8f9vS0X342HMfh9c29FIRZfJ5DAnshSPYssV/Ggk4bC0hyxT8DUepO9tFZzehmLskCTL4GGkjudT57US3jEKsEu1YzKuKLiSPDYrcfsYp5Q5HXfnWMQ8l/VK3S7EbuWex90UXEMOm5X6OCFT0NzrRMyz2aTUu/FUddyHB/aRY0p9CI+zONDbuRuo49lMzVl1usBFvGidwBxM+Z/J4rCyV8HlyGzDC1tAFjHPNmXfwJ2OD3Km4gm5GBmSoGXWCryWuRnT8ChGhrcK9ByXd4+cwRmb8WzmSZqNRzkgy/r+Pm9EYJTHFuH5zNNMPMpx5fn4MrglaSkepQ4eZa8qYpI24enZrQotx9NzVhVagKdnj6pDazw9O1WhUrmoKkylPA6oEI8DdfNkpbFDxVoqv47lffstwY+2RDik4BayWgUsICvGS50nj0OKNvdMLlaDZ5KOk8UORR+TZYowM29ike/PVXuJGg4o3MGzWwbW4sPz/i3AK2Wfx52LCj8g579Ab/e/cpYQ46nyT8BOxYd6Ns8CndwtawMe5omih/covoOc/gqaO/NrVuNxU4kf8GxuB1bi7k0lLcALsjDdBzybCwo2dHfnhTbihbmWageeawpOp8Z//YknpP6HFA+G4rmsjnTzcvnjRaHbePAfBR9TkjunYqfq4UHeRXp5yh+Dv0ccs35/Zw4ww6M/vyi4jRS80gMi6fmiaANPyDNJt42ysLeKzibB92fK3Eo5rFZ4AV6c18o9QAnYOsXNi/NEwa/DjDTYLBU8RYLRKnjdSMBuFT2BJ+xbRPrUqhEhWk56paKH8JRsLyTp8VjLHjZ+/GMVP4Gn5XiCkk/hqekzo0pzO+Elcqs6s/ByOVOVM3jZ2LIqbGqMVxCbXtYUwytKnfNlnK+DVxgbuDXNjm6GVx2zJiNGzM6bPWJEHTM8PQA=" alt="MPEN" />`,
  lethality: `<img class="stat-ico" src="data:image/png;base64,UklGRsoDAABXRUJQVlA4TL0DAAAvR8AREO/kNpIkSck6fjREvMNPbIN2g2HbtpEo4Paf9z87iCRJkbLnnpmcveBX9tduY9tWlXPOu9+A1D3ykAaogpx2aYOhAiK9Jz7n19hgjhOU4EAEBCECKGDR1oRlLTlA/xQDSAp4GEk1/semBjePc7MlGUEgaGSJROKoiMCoCGCUAIySAAGiJoAjESACREGAEAEShlEH0AOHqPA2QH9J2huAwCkhkBIcBKkGqQaowMEpQPBvZc3u4k8OiGtTEUcxgJOi0MIoCQXwyXSmJEEikIQlCiGUpIGiJoEhGvobBKcDxLF5nv+5ndrw2aV5f5/py/P8PX6XQYh+8Zoa/rXekWv19GsEgaJs26ZtZ/bMZxsnO/azbcd5thnbtvmMjJ89e821Nj4gov8T8PfvXf9H9b9b1z/ri9X0xFbUD+tRP6xF/bAD9cNG1A/XUZBJfwbOfN/yL1CQyr4NfK/uUlk/8KD1AwPrByrrB2ZbPzDLesKtCTwIHqXIT428a8H58y2694MPPvgr65dGPogU/LovrtET11FnLsY2os5U912I7ECdmYuunEqtRZ0ZIInjdetRZyo0zLmhrSiI06oBqr982mw1CjLLxrVpLkrz42coyGyzyS2qUGkqa9UAleZfa9VcVJpd1qoBKs1Vy+BIifMkcFSanVb/UGKUlTBPNMguqz9C4m43+M+SP6vE100w8VMiXLX0NwmmBtwb4DGzlaTYakFPuJU5RgYzzcyWUMd2C66jIfMYc6x2DUNssagr+WHgIGwPvB5zS65BYrtFnyDB3sDb0leBMSE2p2w5bLXo+StKugXfkt5JVYS+suiNqxY9i5JsirjkiQEKjwzFz11S2i24H4mlNXNRnBmFzl9RmmciIyXp/6EByuX+Is+h4HsWPM8QJ8wqlI+vyNrnKMiByJeq/eO3MagoI47FnkRRDlrU65rkjZdTqx1FOWzRPRRgwg/fEZHwM0OnHIU5YGFXPo+b2R5CEvd+/WkiinPQwo+Qx3Qbfv4eoYLcOWThk5eUzcCSD9MAvtAyXfluwRNOKQaWu4w8tkfMbo6nBPe2We5ilM0my32WLPwVyz6F8t3yX7pFCJ9nBUeqIFPyzI6979ThS6zkDEqIV/fkmVnFEJWVfHEsKszuErbdwV+wkqtQeR4tYbZhg5U8fRs1yeidJcruRE3z8YU2nH4NtfDStOamoXbiN5tZ4qi1+CdnSx39wFG7L00pMwu1H1+UN89RJ/HPz0YOf+SouzydegB1G3/KzBa86ajz+OeOWggA" alt="LETHALITY" />`,
  ad: `<img class="stat-ico" src="data:image/png;base64,UklGRhACAABXRUJQVlA4TAMCAAAvR8AREFehoG0bybkH/lHe0SDItun8Ve9whI0kY/f/0ZD+O+PYRratZL67GxAxhBRCTv8FUIJLvN0fRlhg8CKpLQX1ntSU5gAjjDSitEEJCBSycIMBQvYPCoSQ8SXBBI5Hv8xVay+cxgAivE5MmwgRRY00VkByJEmRlJG9zDvMDD2d//9gQ1VnVC0cI/rvwG3bSFLWmMxqcN9fMFbhOBdZVw+wxIVXaZemTiEdzpn0tUT6dEfT2jBJ+wi55At5WPlGJv04l3z/3ywUmVgVzcNiJspbkHcomsWCMBApc1gQRlJDsYS+gWmhcESGTHuUT43/geNU2kW0mEtdRfgHDa2kf0HR/SbzqtJO3eYSKprFSLxFswNxw7N+aJaAw4pSe1n07+UJ1EjJyEg49LYvwZ4Ew7IgWBbXhLbXSaUeywUjh+WCgcMSeYZh4LBMtk7LHfdYKh8wlyVP3TO2JWcCs5jtciFzMLNInwyt6Rl75PKOIC+RJ6tyubeacB++tzMp0BBMZMCdS0PIxgZr5lxadPoeVRHvDG3aSchqY21aNiVqHZo+JR+hKxiWkjdYqFLywQjmpIkIKCV3oJA8xPvwh8IoQ86CKJz8C2IFS+9FqLS8em8JrWs5vZ8ceB/IGHjvuryMPAvZKTMD33yI3XHuO+GJ3Po+GfdbcmeGXVkOgwzL8qoUZwA=" alt="AD" />`,
  ap: `<img class="stat-ico" src="data:image/png;base64,UklGRjgCAABXRUJQVlA4TCsCAAAvR8ARELVArm3HkZLw+JmexrsdSRAHsZCMp0v6UgBCmDF83K7wZtq2De1fXFaRJDt5evCCDgxk+NvduyOnM+xEAgCkORLPgA/wAf7jJHfmjVuizd3XrLtLcl907YPgRpIiKVKpKk3sMQw8IaDpSagnscwjbe9GMpNhFeaeKbAR6j3578zrboudtGlPOqsgS1ocnYlHFWUjrJLotilfxWl4itijitY6dvoJfZ+6NDxCWEcuq2rzS/Cuk6AikhgLocUjETsoS+oLS6otjpmQtTuQid2mrtCkyoLR7Gi8tB4YSnKLR7wbIK0FQmuCbLfBS2tKrBWC3QwvXbBozZhaxeJuR3rpkj5s3QhtOtlreunIZXXOyXbWS+N4DfJ8KxvQrb8tnsH8UnxxxDkzsMzES3GG4kaYYzvywIpuhBG0Db8w5KQTG3wAW80EW82ciQfWapgzA2tVc2VgpSdeW9v51w21uvmKtDoSaZWzxQ3SKt8GaH0c+1OXLVbkNHxStGaz7/P1pAC1wTaWpfwns2CN5qLvJxiRSBuc2H+y82oy4oqy1f1/UZ3lU2KR55S/u2TcQmCB55QNmDVcY+ePrMPi3+aDpX+GJYs7pzQ8NvAwjEKOtL0bFj43oJuMKNJtdeeU4tVGmdOvvIe6FSMC+yEWyZBwdgU8vwIEZq5u/3rrnySh/t3NxE11BPk2n5PtrK64D/F7/SvmYP4lwz5H2kati6vfbQecVKP7plgyPBAA" alt="AP" />`,
  health: `<img class="stat-ico" src="data:image/png;base64,UklGRg4DAABXRUJQVlA4TAIDAAAvR8ARECap+f+/j8LoNwGd/+/zpYNkyZbk1ynyQy/uJvhqXO/dtw3+G1AUyDgUngm6PI/HxtHZ4Pw5qux1AGQ01VbPDGzQluhoJAuQaaJPMwSOI0ly1Ph6cYfs7EHDE8iRJElSVrRV4oJOD25+6IDocAAAIJjMyLZt267Lddm2bdu2bdu2bdvGBHCaat/zDQmpILIQ0+AG/IB3sA9agZ9kPEkNP3/hSIUgrsG/JbQFsx/yu6H5G9xXSoQxyAcTRqfg7i1YR1b9couX8esCNGX6Vh3BreAg/1+ol7EbVGABxtQS/CKah87hd5PnCx5oUo9gUyYxt1HesUBgpzo2Qfoo7wiHomMEu+q1KcQNvP/B7cb9brD3neoRMS0ThRUG3xf1Pdd4p7IpHCGwon7fnrQoGscX9f9lKJI1rv9tqu8va2oM8U4EzjTkdpNpVBkSzGBBA34d1hfCKh3rH4TWo2FbSFYkTaYNXjUo6GpUiFlqcCiiY10hBzW0lBnJc4arcCocaHBwOfB+MEiYu2ZRwpmNf3mQ2C5NE9BMFtc3Xmm+uRB5HMgFqJ+ZC8QyeMrFNcR3LsBbNraDi1wgjmHzuQCzqJJcgEJprrlAcjqZi6HeuRp/8gDOSxql5UFSMikI5kEyHpJSMzkAkyQppZUDk9QqGu30oKVGBU3IpCd9U2D1HamJGllz0OVJci0t6GHY/ZDVIswwLYMBbY0VpASV0XrsBrWdTnu9Hc05UnCSSpdc3mjpehHxnMbDk3R/tz0F8GJMij6LThl8xdf7mX4XtWLr/Uzf3eAvLvDYQ/+CXVTLexgSBEa0/AXDIkVHs/wFA5cmZUcC7k8yePk/ivoeRlhCCRHUTzJO00KD1U8yVpMFBapfZLx3g1y7yJjvBrh2kXEb3Lx1oeNk7N3H/TyWOeyMf+gk98HHhfVMcc1mN2FtQZ91AaT56KbL/r1Mtbi+YoMhO8PAPqb7S6rG5vd1plzebdUAmceYOEzpS0VrN9MfFtSGUdWFuB5Z5vCYUQDoPcFpwA==" alt="HEALTH" />`,
  hpregen: `<img class="stat-ico" src="data:image/png;base64,UklGRkwCAABXRUJQVlA4TD8CAAAvR8AREB65tS0pkuR62zBY8WNYbCeHsyIih6UYZmbYzWUQeUXmFckJdiDOcRBJkiKnV8fzb2c/8xs4x5EkOQqmnRNyOhsNP3zAdCgAABBsZtu2/mrbtm37b7bt6G4m27aSbU6AJ4L/RM98rk8oz8VKTfHMZ/Y6dkPk8kJSQtUC6qiN7z6TZ9fjQWUtB28xJnEEiW7eV1gdWn1Rdwt07ufPaxSllauWDU48wFMkgjPgk9RzGhGoBHcxLmSoEmW95ljBm+Av0lHdNFf8OAOvoiGF4DNSwTNwr1e3Mf4gSFvURnJSzaqOwcaB9DxqFiJU6V0I7kIt3On/hZJWlagNfknMVaAGryQCfLH4snBYpkMSXN5SGBwXIFgJ2QIeQpa1XKGaMQnbj1oEJwdtNRakbnJgzxpJvVhjWSDg2xrXmFjHbohhHboo1nu4E8wxC2Kn4MMaGBBzMGONI1fuqTWohVyldsY+0Fzxco1lgYALW6ydrkiVYQuhrcHHkw5eLF1zVWrTDb1i0dS5BVbtMI2ufPTBypcXWo420Ah444yK6/80UTjxcIOXRI8F0iQ32byvMMiQWkEluNE3qAml8tDN0lzxYEmlvHTD38C2QkES56Z7cnCJI7FCRLnx9sOdAbaEwB9rjJv/SmyIFEi0Z9iZ0lBrAuWvZ9mxGyJqvlZZ8kxvIcZrLHL4e7YtfnBEV9IHFlfP+JTITgCv6573y1djgfuuRMdzR2MLvR0F9itR9vx/gakIyNAtnwgvPyIp+e/TbgA=" alt="HPREGEN" />`,
  mana: `<img class="stat-ico" src="data:image/png;base64,UklGRrgCAABXRUJQVlA4TKsCAAAvR8AREGfktrZtKdkXnK3A/kML08xlDHida2DbtpEkai+66HD9V/oP47aNHHFj/51evnvt2W1tu21zQDqApNRJrr2g5/F6OZcSoAj8rNCZcCNcAPx0brVt5RXUkkcIXUp5BJGicBH8yw/4AwcAAAYAAAyOBQb/gmGFYwKwYgVgACYoAINihMJhZYaFAVIk9APUKQERjPCAwPhDi4Q+U+KDT9ffpPAAlaxYlGIUBDByIBRTtmjBqJHBqMGoHzBe6NBlygrBsRxCm5JbbpAg+JdbEfyhI5dGglZkLKrwxLD8bUSz/+oIGZ4R79vy7fpP4/6dj2+fHKddr0mQLdu2aVc2R2zbTk5wbdtmbNueXx3NOebJe0T/J0Cu0vBgsdf8ODgctSLzWTAI6wSQdc9fSA9O5791t4Czy2KcfU47B9UprpJyccGhE0dRFbhwr5+wFlzyu5s+XDb9vpMlXH4qxsWrXAVMHznYr4XqqIMAlL/SPYV2zgrZmzw1DO5RnTTA8DdVP0y/EC2n2+TH0kRWwngmlCUA85skn2CfnUgRXUKAiWOCkA5QXie4Dc6sN2bb+SRojrD6C9pFo0fgLdwwOSwnwpzJGJhTlw1epFGhMULtuA7kT9UOwF6+pbRbSoevSrfAX6807QDJKmupHm6r3IHHPyo/XUyrdLkoUmlygX2NAR+bGoM+XmtM+9jR+OciLVxjxEWxaN5w0ajyyUVAJS7Vww8VafSQpHPNQUmETkIa35goj/OtaL2nGxb1WbL0l3qrOVzzYrhANXBiEdFOVJAspimDNBkPxDi+nCT1jpgn1FBkPRHC9RmCgo9CuTtnNvBGWO+WmKSObQlv9FyqXv1z4U5qU5r8Fir07+ZyLzfx9Fhc7n359b/onPSq7h+vxPXmq4+PHn6ID5MrEwA=" alt="MANA" />`,
  manaregen: `<img class="stat-ico" src="data:image/png;base64,UklGRngCAABXRUJQVlA4TGsCAAAvR8AREA/kNpJkV+lFqwTI3yQwTCwtbtNg3LZtIKot7n+4/Ye8BRqmjSQ5qrs39PPP8Nlz244bSVKkmxmNBHuMhpz/ZjDDcxlvsSoqcUHekFcInN9rYn9uWd4SYf2rQsZkIaYwFMqEakIy+MXw/uNf3KREsBoxCKIqwgwNEwgJhT8AgCB6AGAMaDCgAwGQRugADGhAAECNGh1aFEHAYIYNNBTkoBVCiT8KEDWAGkOoMWBXDqiB8i9MgModXRCDBwcTFAwiNS+MaYMwYwDAIGH+U4wPEMRQWL/exW//SZk90f28fN5pf89dLf9Db/d/SBRxfceefftHpDDw9J13yJZt27SdY13bmNe2bdu2jdiZv55knzXGip8i+j8B6rDIoVr+v08R+O9c/NTLn8PHSpny/gxC1SIy4LLvqU6+XbDu5ZB8/8icUycavWtGfrxu17E4zI6zKTbLiVQG7UmrEucNfltejki00z5L5iT6czsOxWDBrQ3JOSakLJ3vVY2Ybcqk6xHT8wizG2L+hitYDshNY/IMC7LdTXQl2BWemEJQSSqL/62g23wk/YJf43gsJMh7ZnjdKIyzDJfCmYD7XEwy6oZ1COsmKiy0LagZHvmE8VQQrWIiQtyN2WEax5wx5WEWmQowfUzihVwxZfkg10xVCt1mGsN8YZrBuCuJljHaQxQBbfFUuUGe9zRXil5mKUmDvXlHcqL4bY76FwTay1CaqIwvJ3AFt8r5oRa2p6yBZkzWrvL6JxH5D8rs3S82NvZJyZOGzeRffFV61119dDkDKWql736w2NHb0wy192Vk7Wqps7Vr4GA7qD97AA==" alt="MANAREGEN" />`,
  as: `<img class="stat-ico" src="data:image/png;base64,UklGRgIDAABXRUJQVlA4TPUCAAAvR8AREBo5tu22kbT/Xfa4/2sdXUUQAHUm5ngXYayi8axxqf1ROWzbRpL6L3jvDWWHjSRFTvj+WGboAW4TcX5wAwAg2JwSJ4fZtm3b1mQcYNsqZsZrHbhtG0kyjMlu5j6SzjwB17088fkjZ1Dc+M8Tib4VmH3cAGwEJqfmJoAsQVTNTUCZXEebANhrbgNik+PJDXSCNO9K0sJ1Ef8uFV3/0ngTldNrxEqj0Qaq1WgNmUWmE6iIeNdtZQ2QbxoAZCEztib5EOfWRLVMgA+lA5m2BirVm2YDmctYwgYyVDbAu3OJQnpqJvPMG++HAZoBeF11Cde51kSxY6Sbxj2EaVnhju3O9yBiJkp52VVIXkVM5DtGvoX2kPlStdJipmfISO6KoP89H/YDRYzsrSOHiWrr9vfA3PELTsCIUanrCFfYsoV/N8IbkqNLCMlZJ+A6b0NZee/X/er9A7URsKsC6magBccG/i4P39TGzqzQNNaJkOxMDJ3ux+cvVeXhl/dZRr63uwPyVivkC66PR/2u8gHZup/lNmYOOpq0k2/eOnevNZO1kiA2RtV1lgR9rDBYEU9l1Dl/NgzvCXYri3erTI6Ks3pttps1nEHEZyubQiB7fm+sLQe/kW9qt5pjJK/c2V1GNgdYIsPvnMX7FdKjkuAKa9i7IaRXZbHap8ebZb6kmXhXLCuyr5KnAgreNotNcp7BF7nip5oNn/PA3YCveL+aLdwL+Dz1t4hCZOyA60UWzEFdE2uzK3XufpsdAZp69UG+ddusII0UYH1pdvmh2RWuc5mPUKd4DwGtmLq8uEwPmQXPbLNj4IZMDVZ2DDDkmh1+XOYYYKWtk9eOgMfwTLPD+TLdxN3hfLUfyD/GA5YxKE1Nk9iwfsUMGWh22B9MP7hjj261A+75fB8wJ+AeAZU6891E3NQHone5L/6AyB+Bf7nCpkaCJYDs3NcVzNZM9SdvBMy4IiZHy/sv8yX9g8hy5fbv3wd8VtFa3BeD67wt3A2scG4CAA==" alt="AS" />`,
  haste: `<img class="stat-ico" src="data:image/png;base64,UklGRq4CAABXRUJQVlA4TKECAAAvR8AREFVAkm23jrL/DTYwotBlJ1jSe+I/cxyBQAoBboFA4q96Q8CObNu0Fcq8cdx8bNu2bevZ+LJt27YFQZLcuM3o8I0soAUYfQH+/+0bkNYNNAmqEYRnaLuhLQGaJGSv2yny2e5m6wTcn8UNkAXFS6aAeJGuTHwAMAMAenQAcNAoAhx52022MK5kC72JQLReP8NXC6BMQNa5YtCYytJSJN4VzYG8AbyH04iCB+kiAkhTEkUV11RhSAOyqyao5dqPWDoQaQQMsVnkFgizVhlwpkA29/pt3fy7UQz9ysedF2FtBRZ0i8NEJxPSPfGhLrF4ud+sMN4+dK4AwEEXRQvSPYC+AygpyyqK/wBnKWPoriFNSQy8dBPJDBIfKEvXFRkAPW0UOUiXZJhVWjaXqojibe9lTEB3yjrwZAJjEkJm/ChbLBcAzrLzhYK7G9By4iclRDY/gNEkF/Gy9TBhYMJCd5VpEQBGtz9+9zYGMqSzaJgnA7v1NYy7Qz97w1g7Cs8Mrx1wtltB8CKtQTPmJZu7kUPuKjnjizQMAcoDtmeX+nZSnTKpamoNQpo87hnq5SP7tWiEYgEa+6Q6OkNPfwAgdxnE6wRRNvif+KHmB+TofQsuwT8jI/SCqy1oIm9XMTwHvwQPAEvUdfxHWMkEItOI0AsYe480AdRpNvVwqtXEnmbkDWA6f2AihVlVF3yC8+e7AAA9I1U/18D0A6XqfL0LApFRKtH5RhfAOGDuHsPX50aB7LZ7BIaav/CZq1AgKh5monxakNNHmQkCJIk2ihvEASYSJDAzq6GSb16U1OBpduifBBwBBEViRw90N5B04mVTaxmkZABQG6eYWu6/Qp/QAl/ufh+Ib/yuvPgOiDq2zkffrNtrPnNeZ7ubrvP6b20XAA==" alt="HASTE" />`,
  crit: `<img class="stat-ico" src="data:image/png;base64,UklGRuACAABXRUJQVlA4TNQCAAAvR8AREOfiEJIky8rdu/PXOJTn8gT+UxoM2rYR5Oj4U30GvzqIJElSctjAvwqsYAEpP1OOI0lylO6ek8jvxb3RtkijcEGagyMEZsiZiec9xus7fL3n6XH32f3fEkOTC2mGyeg96kjNo/bf/Kf9pCCfFQhCgP7//r+Wjzyb2MAYLhKCtkuDkgkk6gUwBdHCQkQ4MipYtgymkhAkC1EmJRuJuMx9GUF4MlBp+XZKcJnl1bWz6cFl9Olz/NxrOxUpCENkgUDP2CK2sQZHpwK/vme8IMG2LUOybNu2bdv67/veO/+BVGZEZEYMIKL/E6B01lSloqq26QPxoVVqIh8NsQ1T+iDJ34gLT5TwSJIziMpISVbBwy9Eh98V5KYhmsYMYSaDvEAk2MkSDrO4jyjwkzn6yuFpJyIwOmAzh5y5Q1HVfp8uMgdyHYWguQ1eXU64cOHWEAow8sYH207Cvgs59lbIODyMbsKpE08MofpJmke7jzrdyJUPhOkgOeKGMy/MeJBTCIFZkgtwMnrpzourBj9jpblgNwDWvcgrBOp0MQYQtvx40geP0YxjOAwE0VAAcszg1JLB9zxMhMFYCPI3AvxHjjGM3k6CcMmQg6MsWk5dKFkY8g+yjD5YCYa5QNw1SMLPvHlkGIPJQpHTBhkdrQKTBWAqGPkLTp8VxgKE1XBc/umyB0kPhcgK8Pwh4bkYXJXkXTIWI5yUYwvqLkrf5aDhpTCMlaPXWJisHOc/S4DfpfANJCylQpYM/E2FsJYK4SAV6kmGJQP/UiEspwFmPxMAs58seQCY1bdss/xuMOvvmGWkbp+M2am6LRXC53giJNjIQhokwWw/DZLw/j8REsw6N5JQCVtMhIQfl4mQYNdd50mQYK8pgHW/sKxF4HvwmSUOBztnucPArG6FZQ+B+wnG6AfbZZweuG04Y6wOsM+ubUach5+MvAJmjTuMD8NPTKHUyjQC" alt="CRIT" />`,
  lifesteal: `<img class="stat-ico" src="data:image/png;base64,UklGRlADAABXRUJQVlA4TEMDAAAvR8AREGfjoI0kR3Lv3ecI4FE8f2o3TYNB20iOnO/8gT2hthAaSXIkRZ43NI7E88f1U05j23aVc879OX9Ltii6oAAsbVAJtaCoCHxO98bv/gussK0RkwUIEAFei8WFQMpACkpsGtARJVgEm+GIU9cilUQKAMkSEWKICw3CIk9SZCEiozQQlC+lSMFAAhhqEISQI0EafnjjTgWIcpwcBkEF4MwpDyeFaoA6A1hUY43gqbPmhfrfzcwL2tw/jLlnp8f13hMQC9u6JMd/Nqf/cbjv93PkysM7unV2bf7/83e8rM/8u3zHS88W1G1rOyRJz/natm2b45mKMrvH07af+7+AiHjzjS9HPyP6PwEOvld/8Xj/Z2Hm76Lof4rPr3qXI8uvel/W9E6D/vY3xR/PnxfGjzItSQcYN86q+8mYcVy9dxkrTihYxomz+nvglP4eOKrwXZLY3H8/sGFzLx1F4UU8+PtAcZzJ0NIjjw1Tis7isWFC0SWczNsvgzGl6OIjZz/Vh5SrBGgUncXZNPo2ZbP7mVC4OJv7koZhSuHzZHFRQ9EofBEns06jfHrdSxeNwjdxm8IobNRIIzOl8Hlsm7Ko26UQoPyooZhQ+Apub1HnoT/p+vmQ+tNoFL6B26x0SfNvOh9oMKYUPodtU5Y0ZBITCl/A7W0aNocphW/hNg/qY1LhC9g2ZUnV0Sh8Dre3augmgWmFb+A2Dwf7MBqNwldwmyVVR6PweWybrQ9VHdMK38Ttohqfj0Cj8EXcZqmKEqNR+Dy2zbYHqo5pha/jdlGdx4jQKHwZt/mhkl8dZFLh87jNGVVaAkwp/AJ3/q5Kr9HHUYWv4W6+qqS4l4MKn8f9pY6f6GGDwpdwkO+reOJudileHC41zNPFQcV3U91Td7JP8Z04zokKSgfrFd+AR3023GpaHFR8P67uHm7/pfheXN1d3PkuthbXV5yxDte3g4y9uL4jOGEDTmVukMM4YQPOLRpyF07Yi3P5bojDOGE9Ti4a8AhO2ICr+2YTTtiJs39ZSLuLR23twdkcUvZ6nLEGZ3NSyVdW4YwdOJtjyj29GWd+3I7TXyv1TsHVv02YKwWPIeXp42N9Xz9+/Ljg8aX04qEBAA==" alt="LIFESTEAL" />`,
  omnivamp: `<img class="stat-ico" src="data:image/png;base64,UklGRvAFAABXRUJQVlA4TOQFAAAvR8AREDUDg7aNJDn8Yc9+uiMQERPgrx1rEkNicXuVdZpUm72QOSxqZF0PGJ2g5YtvOvFYUrZ/jqRo2eOkjWfYniV2/6uqxwgnrKAAMQhJSv5VtdvNKfMZIOpADCdkoAKUYYnzTwBKeBDAMQcB+OCc5KwK9KDEcSNJijR2nM7lgaaqnkMP9hjfaxjEtpEcSZtDSXVupoHNP6xzb5KAHEmSIum5qL9meNBMVU3DWGszAXKqbXPlZijIOeecc845V9raOS2JBeBcunJtAomDaRjJ3Jk7CgC+yu22hiEEoqCtBsa0W6nzIhANoVirVuXywvgxLBFnlxeEwzJQO/0S+CmYgEvDWBjXAHKcShgYNJKkqDTcM7OC13Lmnp0+g0iSGrUJwL8UBOAgfM5BA9tIkpzU/8k99eSfFh4mFkUUE8CN+YIl2ALaCi9AyyWSOAeVyyUCM8kcwUzObZVZwMSg0ixsJSIiypD7GhwRa1EQ6CQwlwZmBdOQSktIYAFVBQlEYNbaJLBEwdbGkrP8s8BTU3HHg0PApBb+AlT+NTyaGk9Y77SePX2B/yj9BNgpx5UwOJJ+9erVL0tSEHgFYHilIjQEQACe/Qd48z5hFdOZcpwo5tAzilSfkD1ffm9QnrHHPqy3t5KnoLzgTPhWK/Zt7ME11c6W40b+BF1kjnCJILjKbWApERSAlfKfXBldlxRbClAbDKaw3I4jPjuf+O28wqvYeYZ755f+vfPFLXdlBQNQSsJPDH1ydG/hvfMDIOiMJAEAWHxmX1vPQ1JQci4oTFLb0rom9ZKaac4cRR+S1LgxM/sNqQVjLgy0fHIN8C9IkfIbz73XLF6b2k4LNJStrechTT+zZRr6druKcm1QpNN0yAUnZWKAAFtxVWz8ZbR1X2sc6JLUCQBMf7NKOmL8umb2X9L0OxtAS/OhdDrtM9HAxWfvGYPV5dylCjU2JyU3VHRpBvYOekm7ULrlrlLScgpAB6pUMNoq32ZHpxkaoRQpAia8MpYisLeXSdPvrGQn/9mkZcqALimuI42bf4cUs9989xEGsRSzCLB1W6uL1AHsni612TeTX84KLV57ALAkOSPopLYWWxeUUuopOtqaZvHatLaeh1JWuNoGMnyYgkuI2ocNQp2ZtdSnyJXNcQVohSIl+svzOuBc+b9DSI2k2W8ILmyflyoTYBhas5ya7WHgkhUAs0TTQKdxwC1MywZxID8Li3UGQbmAatlIrgtKrTpCa3jvBSGlvgkgJY2SVieUOjNS6RdPelQrEeecbQKCU3dZihZOXScHaVlPrAsSKKUsct8RK3dyxNsKR0TBCrI78xTsQOY5T6leVVkL1IUeV0oUeQuw+wWgjviNCGYA89+QympcXewxpR56B8pSNBMDVWkBhchu315xSH0ckaUeau5VAgCHbMAGAyKidQAYasTp6LCPJGGlVci5WF4XgL/eAExfiKPuKrq0k3aTqqT5La0CkRujlEYbqdUKaQMNQGkVGF6PLdAsVaRBvR54vo8tsgD0VEjyA4ILZv+hwmNA3HZMOgkaqJ3tBjZea89FiiDzPBR5q7F1Wyua5DzAxnPvmUgjSDMaKmSp6iXgrisVyi+ZCBNA0w2VNKGYfYcA3LQiTpS4CsG0WQOljvaugMdJPSwTaQb4HIZaBzQ6tnUP45CJtADAD/VGw9jsqjpv3SMX0uLKQ/0BJPOdiYpzRZ1HEhuPTZJstrp9qg3lf7h3kAtsHS5WAGxfHpsUaOt6xhDFf0nby9oAjuKfijBonSJZtnOHiDHEAZNm3/kC0AWzi8+Qumzv+sYQBkLqwuGA8pmSAqzq2MH9GUPoKMmM4sRvxds6cimGKIODa5fW0VIQguN4vVIaCJlQR0MLp5YOHFCxFQDAejrG3gejT9FZ3jB6p3Ed6TS6+tpbzRhvNfoaRuEdm2Nyiv7EXPXxBl9HNTNnzvksKq0HY2AqRqE/Mca+NoKJcsTmdNtF++yvB3MuqUUUHDHUoaslgYyBXch7SirAQ10LBQ==" alt="OMNIVAMP" />`,
  move: `<img class="stat-ico" src="data:image/png;base64,UklGRsgBAABXRUJQVlA4TLsBAAAvR8AREFUwDoA0zv6DwiA9NKD9J1UgkEKAWyCQ+LveDE4FADSjT3n7OSMtLZln21a+9bOi20tnq86B27aRZDtosNp7m2L2C8SxmbXbTxPA6lHq7CXbxHrSyKvAnTiHVZlCgfO8ivW93wXxLsXVT9A/zIIEXWjs9G0i53HTyARNZaahWP8UFtBlCDq6U5pAr7M+hXW1AH2V0XI4+Ph5SIO/4MlLhEcwSL+LCM/9qEJp22e9DJVtn5UOhVnOqAG6qAyvd2mgtjSg53kyq9RoShWpU0xBmZ/fWmA4yjCDhVOsnVSsZZv+s5SVfZqQ9wFVS+MDqpbG2772hcJtX/xC0SxXv1A5DVRNIxXTUBklQuEsA/5yQDF3lyEkQnVVUUEEbdLvYZreklYv1dSk33uA31lqwD6TeOnX4CbM7bgUHSrnEBwlYO8eC+vv0RDZEVbFFNB1hHCmK2sWtOx+T2DWsQBouollO0IEU8DeEZjdXV4KhE0LlXMEpPfHpsCS5z8owxS4TAT5rsOCx+kfqxOUANMUlG7kYdl9AvbuwPp6COrW+U1T4JmILgvoKFPgljQFXoFxmyk42pnsV4spOAA=" alt="MOVE" />`,
  range: `<img class="stat-ico" src="data:image/png;base64,UklGRqgBAABXRUJQVlA4TJsBAAAvR8AREAZIjSRJkvgjdSDbneURe/+y+t5oxIwkCWU8zqc4+nnY60AA0rghoZir7bZI9ob9MgVzYZ8Jbi4UL72w5b5xWhoMgbNln3BDsuNShqjD1AhZBxM1QB6cq0c9gEcnOIhGKwgr5jyiMBgrjy9gkoSCml1kyum9OU2UsB3qkk7ZWgfifRt5Ch00zqM0UNRIAxIM0OlEw/cqQaC7EzqBJ7tbxa7nx7uYvGY5nWVc0Nln6DE1YZDmzq+odUTRwb+s75E9oU4UG8CfUCnDczz6pJR/TxtZ+Mhjr0QUWCZI0xV2n2FvD0KXzcYB87/LWviRi8nUg+/2iiGcyYwfVo6DZWcaf0Zm4gnd75QFw5tBbWMUHZjRMMn6QS7znjT8DNk1cSBlHmv5zExsBVXAfV/yxh1dNphBICVOZpBIhaMZJBLxdf9TgmpBQmlXOEiliedbTe+ZS6Lzf5uCrObbVhoS7u23rVQloxSNhA1hFAHqW4Zv2oFTAvtfsrt4I+nCSGOgJbr5mbir8QlNvbAmeuJXGbj0nQcKqA38G7AA" alt="RANGE" />`,
  gold: `<img class="stat-ico wiki-gold-coin-img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFQklEQVR4nO2X708bdRzHX732uoN2egwW6UBGSwvDERnoQhRxZjp1LjxxS1xmsmfLHpjtmQ/8F/Y3qIkmZsY4fCSbYc5sw+jimIJsSPlRVhgDButR1vXstcUHd73elSsjuoe+k2963/t++vm8Pp/73vf7PRdPkOy39yXJ3lcUe1/NPsmjXZ4t2ISNFrH0y2lSFJjX8lx4GgAho7UCZywANh18TeLKoGr2tTzn4b8DhIDTgovTB9qFZwEOtLt5Y58bqdH+DFQkrlxX9aaD1Asu6vLr3NsKgKv0Rm2N1Al8DLza2yM2dIVVOlpFADpbvSh+E2AdIKHq2Y+PZlzR2xo3otpMXz93gS+Aa2qWqc0ASivQBbwPHO/tEentEamTc+bgrbEMj7fZ4R9lMgC0tHlpafNSN6Q0Ao19/QA0Ap8Cs1utwFe1NdKJQvDeHi+ffbPC739pRYsys7x5r0jvBz6CtQoAH34Eff3MuOET4OdU1hnCBJAkoUuWved6XxFf7+0RTYMffnpoXnfsEdEEt83B6EhxAjbvFakLaxw9Ahe+h75++OUKf8QecR445wTgMR5CWM3mTwRkdyBcJVEj1XN3Psng0D0Csm7YFBQJh0R8O/L4fAIAqVSe5JpgOrs6qCHdBr8I3e2s+0VcY2Psk2IsARPAgJrlkR1A12HgcEfYF2nYtR2A+HzSNHrnzUrCIS8AOW8On69YhbOn9N8bQ/pcGY7l+fJbOHkMV/sLcPQtuHCZprEYh4ApYMQKIFiuI50RH7t3PcPd+STx+2tm5ltR10tuzp7ycvKY43AT8LbTgOB0c3Co/CucSuXKjjko/yQDj/FWTwATz1RkIglVYXmxWGLvmoq0rKFmHuvENSJUWvyW7A0+QSQoafgEEXBn9+xWF1uDMKbPg5KdpUwFSrWShPG5Yn/5/parsG65rncysC5Ejmu9CbGmQ8haMXhNwE1qdVOYQoL1ll8PltWkALBpcIDq7QbIgv2xrj3SbP3JqK2oAhsz99oArPv3UiLHy3tkOpsTRCcVACp9lTTUe00b1QNzizmWkrCUhLWHxfmytJpjLukGNyxOS9Rtk4SFqQXX5LRpsrM0Mcc50ByRaQ7LAETjGuPxjJOZTUurOUZn9Wp0tEp0tkoAruEYjMwAEDeazZmH4oGD4SmVppoELZEq0yAaV2yB3D77UuwkIzi3xlSGZ8zbcfRNybab2HbD4SmVth0KLZEqsw1cGiUa14jG9ewCAYm654qFi9/PsJTU50Xb8yI764rBP/9OsWbvuBl5gEn0dWB9aj7D6LLkCowlOLRfr0J7ZxBJXtGrEVshoagkLEWR/BKyHw52ywBUVernxK9/VLk1AzKg5vlbyfMr8NgJoKCJVDofGbhZ9H5ofxUtoWpaQtWMT+sQuaxqc3DvQY6D3TLBhgoAlOU010fsNkaSheYIMAlcwvI6DvymGBABABMknV0o9WEqFk8zOqlyfURlUIdIAdcM3xuCWwEuGb8TwPGBm0p3wSC9ukZLqNr8QyabsjlwewQjuEpsVmV8kUJwgHklZwZ3BCg9EYWAI8AZuYJIsBpECdoboT2oG1T57Yv/nTnjTDgL0Tl9bVhImslcBPqAP4GHOGjDodTQu+hnhLOSUaMXG3WQKr99e55e0IjO6cEBjNwLwS8CV4F0mThlAUwIycN7WD5GSr+USr6M7qhw2QhctuxWbfZhUpgXSfQDBcAO9DerAj2rNHoSD4zxqxQn9Ja0WQUKgLWW/k4BdgG73aDkYNUNc5oOsEzJMvs0AEq1jQ1HENL/JvD/KugfBSjYCJXrLd0AAAAASUVORK5CYII=" alt="Gold" />`,
  difficulty: `<img class="stat-ico" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAA9CAYAAAAeYmHpAAABbklEQVR4nO2a0RECIQxEuW0hBViD/RdhDRZwNei/MwoBsptzst+E3aeeHIHWSqVSqVQa1vl8vJpIUAKrwME2/ARVgINp9g2QDQ6WUQ+MCQ6GySgQCxzRBl4QBjgiJ/8FYLf7MVOXGvocAFaBQ/0NK8CR4SfNBkeGZ5gNjgzAbHBkAWaCI+OyFA2OleLV4CpwzBbuCqwAx0zR7qBscHgLogIyweEZHB2MBY7RgaxADB9kCcL0gzqAwhcq4xFF+YNt6FVEDuye0Puu3VNEDrANPYryh8pY6Qt1AIUfsgRh+iBTINYHC8/gyGDMRwjegp4Rsxs6+5+BmaKeIaPvvbI6YLawZxx5wrG6HB5tg3YHjH7xweoEWfbTkma/CTsn0mMdE/TIUhzgGbEbmuqo1gh975SH8hZ4wrGqowVrppMSCUy5aLNzl3WpK1W2YZd1yctztrDLuvQ1SZvYZf3FhVhz7LL+TqfwvnepVCqV2gX1BtaophSeq5F2AAAAAElFTkSuQmCC" alt="Difficulty" />`,
  // Official League Tactical Ratings Icons (rcp-fe-lol-champion-details)
  tactical_damage: `<img class="stat-ico" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAA9CAYAAAAeYmHpAAADhklEQVR42u3aPU8VQRTG8T8DwZfKFqJZErEzaIuNgrYaWzGKiSH4EYyV2PkJfAmNRKhMRKhBPoCNN5pIouYaiY2NNKgFwYLZZLPZ3TlnZnbvEjkVCeze+e3ueXZmLnBY/0f1pT/8+tEp+v0kcAO4B+weAE8/8AxYAtbzvzwxPAbAQMUJJoFV4DhwDJhuObwfWACm7I26WgQHMAIwwE3ghT1x28HYca9ahwh9OQemYfjRQDAuuCkArxSAs/AFBbwfmC+74gU1C3SAk4HgSngWfc4BTmtKCE8HdLfqUcuBnwBngLcCuAuch48VoT8Ay8Ir7IKreiwDTt8mow64FJzWMvCxCL0L3LZxHwLX9lgejAOuBS9Z125ZT4fCtT1WBi6DB4PL0tsXPqjssccOcB6exAC7ZmTaq/odOKUY0ANgDTgtPOaP4nVWCE5nZKbiQO0dP6Uc0DfgEvAl8vu79A67ZmS+cO2AtpTwYLAEHRNeNqBYcBFYio4Bdw0oFC4Ga9AhcOmAfOGvNGAtuvY7YOH3lZ9xHhjSHGAirGZigQFmgJdK9Khwrq5G1w0eBJ4Cz4EjHk+UCm5aAB6yA54NbCUx3PQYPA68Ay5EyhAR3PQQPGMHOCz4223gayx4FfoscL0GsLZ/94A7wEXgs3A8v4G/Puj3wDVgx/EBiwqwT/8+spsAW8CEAN6x214/fXt6zQFfRL417NO/q8Bc7j1eBe8AV6rA0vReY38PeScArOnftDaBW/bxRgAXgTXv6fUcXAr2ff9u2zzZrpi5ZeFisHZGlsLnhWDf9++ePf8nwZR1AnitAUu+y/KtcbsQGPY4dg54WMdCQLJz4ls+/VsWXLVUTHTo/LksuKLXQKTzDNnH2Xc66Qqu1t3p0PmzNLiylWS2hRtHh/Rvdsb1RgnesLssG8BIU+jQ/vUNriQHHbEXfaRudKz1rza4kpI7q4abhvvXN7gSx6OsgpuG+9cnuBJh74rhpsH+9QmuRBlWIrhpqH99givxTGcn3DS4f6UJLl+wCG5q7l+f4AoFO+Gm5v7VBlcscCXc1Ni/2uCKDS6FZ9HTEfs3rRVFcPUJ/hUjBD7bxBd4m+zvkkpnXF07n+4epPV0jKVi124BdQ8a2mep2Ci8DrR2qdg43PQwuHoGNz0Mrp7BTY+Dqydw04LgahxuWhJcjcJNi4KrMbhpWXC1ZgJzWId1QOsfn/dNXQ9WwvEAAAAASUVORK5CYII=" alt="Damage" />`,
  tactical_toughness: `<img class="stat-ico" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAA9CAYAAAAeYmHpAAADhElEQVR42u2bW4hNURjHfzMYjUtWIrWaVyFZD/Iil4nyQLmVXIsXyr28uqTceSAiknInCSUi90vu0lhuQ5KYdoaZZrtNYhgPZ6lJzNl7nb337MX+P56z99f3O2uf76z1/74Dmf5z+Z4ujjl+65bKvbk3D/qebhtTUv2Ah76ne8QQuyNw1BZ6PHDe93S3iJMaCJwDegDnfE+XRRi7J3ALGG0LDTAAuGsSjSKpocBpoJN5qQy44Hu6awSxpwJ3gF75rg3yvS0DLvmeXl7I99D39AjgBND+t7e6A6d9T3eyjNvF9/RhYDfQIcg9QYtVK2AxUOF7utwisYnAMaD0L5f0BY77nm4Xplj5np4BPAHGhcknbIXuDVz0PX3A93T3gMnNBPYBJXkuHQwc8T1dEiDmEOAGsB3oEnYRipoJ3Jjn3gZTJbcAV4VUjX+IsQhYETKnI8AEIdX332K1NQVqvqk1zUpIVRQHdFO9Bk4B14BKoAaYCyywLAG7gGVAN6APUA4MBzoHDZAEdOrUHHQx/6Ey6Aw6g86gM+gM+h+Afu8wV70tdIPD0F9soWsdhq61hX7rMHSNLXSVw9CvbKFfOAz9whb6mcPQz2yhKxyGvm8L/Shf6U/xz9UjK2ghVQM549w1XRVSfS1kG3rZQeizhe69TzkIfaZQ6NtAtUPA1YAuCFpI9YOcD+2Kjv7Jf7c5Wu51CHp/JOdpIdVN4LEDwI+B61GaCJscgN4W5NEOA70PeJdi4DpgJ1HaRUKqz8CGFENvFlJ9isMj25zSM3Zd2AUpDtEQ+0iuk5g2rRVS1cXphm4D7qUIuBJYT5wWsGmUzwC+pwR6jpDqW+y+t5DqHrAxBcAHhVQXSNDsX9LCG5Y3wDyS7HAIqeqBSeQx1WPSD2CakKo28baOkEoDs1oAeqWQ6gwt1csSUu0B1iQIfBxYSgoaeAuDnm4K1ANgctD9NTZzZISbCCwhNwI5LCbgKqC/kKoqNa1aY8SNIYBVY+mGDIkKONL+tKnoYyMGrwGGCamek9amvAEfaY6iUTzSg4RUD0j7JIJ51KcCqwoI89QAV8ZRIIog1v9pTAB2EHAO2+gkMEVI9d7JmRMh1SGgP3naLEaNwGpgVJzAsa90kxUvBdYBs//yQX8ApgupDieRTyLQTeAHAFvJjTP/0hWzl36ZVB6JQhvwNuQG1eeY1d9umgqZMkWsn/JwFdt8en33AAAAAElFTkSuQmCC" alt="Toughness" />`,
  tactical_control: `<img class="stat-ico" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEQAAABECAYAAAA4E5OyAAAIJElEQVR42u2be7BVVR3HP1xAVOi6LpbQiocppkksNSfwUYkpSL4VMbEgbQKyGcHGbDQ1LoplQ402vp0IMG26PniIgq8cGIgoH9nyhdyrJtKChsiVgAVxuf1xfrfZs91nr73P3efei3O+M3fm7jN7rXXOd//Wb31/jw011FBDDTXUUC306IxFvLN9gc/L35HAUGAI0B+oB/aTW98HPLAReA1YB7wArFHa7NqrCfHOHgpMAM4ERgK9OzDdB8AK4HGgSWmzda8gRCxhMvBtsYZqYBewEPiZ0uaFbkmId/bjwPeBqUBDJ233NuBRYKbS5i/dghDv7D7A5cB1gOoiP7gHuBu4RmnzfpcR4p0dBcwHjugmB8RGYJrSZlmnEuKd7Qk0AlcDvbrZqdkGzAYalTZ7qk6Id/YA4LfAuG4uJ5YBEyvZQj1ykDEEWC46ohK8DjwHWOAN4G/AJmAn4JU2bd7ZeuAg4GBgBHAccDLwiQrWexEYp7TZUjgh3tlBogMOzTF3K/AM0AQ8qbRxFfqqnsBoYBpwXs5taoFT85DSI8MXGgisAoZlnPOf4vXvqJSElO8yGLgWmALUZRz2R+ArSpsPOkyId3Z/4FlgVEbBdBswW2njqxwKHAPcA3wh45CFwAVKm7aOEjIX+FZG0/y60uaVgGY5UX7E0RLPDAX2l3imFdgB/B1oBl4GVgKrlDb/TpivN/BT4IqMW/86pc1NFRPinT1PmA3hPmCq0mZnmf0/TkgdC/SrwCC2A48Adytt1iasMQn4VQbf0gp8WWmzJjch3tn+wKvAwMAiPxbm2xKImARcDxxS4G55GrgqLtW9s2cBDwP7BMY3A0clWVw7yjmm2RnIuEtpc20CGSOAtcC8gskAGAM8752d453t0/6h0mYpcJFYQRoOA36Uy0K8s4dIHiItXH8WGKu0aY2NvQS4C9i3E8TXc8DZSpvNkfV/CIT8xE5guNLmzawWcn2AjK3ANxLIuFqsojPIQJzzau/swZHPfgI8FRjXB7ghk4V4Zw+UICntR12utLk9Nu4y4M4ukuktwAnt4kt00yvAgYEI+XClTUvIQiYHyGgR0RUl43jRH12FYcBi72wv8SebxcrTUAdMz7JlJmZwpLsjZPQBFgA9M0aifwLmUEotjgQ+SSmvWidz9Jd0wunATHHObRnmPkEi8HbcC4SSRpd6Z1XZLeOdPUiCrboUJTpQafNeZMwM4NYMCZy5wM1Km7cqUKXDgRsljknDbsAobV6XcWcAjwXGXKG0+UU5Czk1EB+sjJFRB3wvsOAO4DSlzdRKyJAt8KrS5nzgUnko5dBLrC+aAngtMP2ktC0TildWxq5PEemdhq8pbZ4pwlEobeYD3wncdrrEOYg+Cvm2Y0VmJBLyuQz5hSi+Grh/udLm8SK9p9JmnuRk0k7N70aum4D/BKY9oxwhoaf9ZoIOSMP8Kp0qM8QvlcN4CSSRLR56KCeVI6Q+MHBT7PozgfvXVoMNpU2z5GfKoUGi6nYsDUx5YjlCDgh8kW3xjwILba6i9lie46k/FTi6B3pnh0U9c9bjr1dUg2TIQbSS73gN6Y2GSOLpxcC9x0Qe5Cbv7Hrg8EAY0BK3kFCGum9CniINAwq2ik9H/n8rg3qNIlTy/GzSlgkREk8HvBu43xRMSDQ22ZLzu76UlcAoIW8HBsUz7usC959dMCHR/Efo4fULnJBxDEoiJPQDh8euVwfun+yd/VSOUkOWWOj//iwnmRuybu8oIaFg6Eux6ycy+Jz72zVBTusLnVp9Cedh85x4DUmErAgdZd7ZfWN64A+BMaOBJ6XQlYZrMgSILWX8CWVqQ1FsC9y/34eOXaVNs3f2nRTFWi9yfVHkszmEM/OjgfXe2fuBJZRKFv+Qh3GklBEuDsyxLuY3Qqr67YQOpEw+Jx7dLgoMnBa7XpzBStqfwBQJxzfIF9wu+ZGLM4x/NHZ9VIYsWlRU/peUtCEwqxwhCwILjW2PJiMR5dQMT4AONsTMTZPbJJcv40p7ZhlSGpU2jYmEKG1eCqjAHrGcA1Ktm5Ixs1UJ5kVzn1KxGxMYs6pM+BEnpVFpMyuUdb85sNgp3tmLYgv9RqLQoklpBq6MfXZuIO56Iy0ZFSHlQ2SUq8vUUaqrpvWBeOBopc07sbETpBTRtwAy3gNOTqjSrQGOTxl3g/zoilCXwOAe4AehKBxYKh1F0bEPicN7ugDLOCmBjAkBMvZQqjVTeI+Zd3Yh4cTu74Ezk9ofvLNjxNzH5Ojl2EKpon9nvP7qnR0g4jEtaFyitDm3WoQMFs2gMrRCnKO0+WuZeTRwFvBFkf+DRBnWUaoCbgT+LHmLx5Q2OxLm6EepG2lUQNqPVNo8X7UuRDHRB7OEI9IS+SDFN8cMkKxXKGV5n9Lmmx1dry6QJXsIuCVLZg9o8s4+4Z01BZIxXiwwRMZWSm2iVL1xVyLRR4BzyN4rugz4pWTed+YkobekDq4MONAozlfaLOq01m6JWJeQvz/1X5TqOaspFaBbJI7ZprTZ7Z1toFS+HCKn03HAaTnbxG9T2kyns3vdhZRfAxfSfbAEGB9vzaiaD4n5k10SiP28ijI9Dx4GLiySjIqb/72zF0jAVd9FZNwBzCiajI6+DTEUuF3emOosbAMuU9o8QHd9o0q0yo2k1z2KwGJgutLmXbr7O3dyNE8ErqL48sMqYJbS5nfsjS8hemePBS4R3TKYyl8GagIWKG1e5qPymqp39ghKOdURlFqlhorG+JisvZ1SQngDsJ5SQWmF0mYdNdRQQw011PCRw/8Al3WRLT2ibr0AAAAASUVORK5CYII=" alt="Control" />`,
  tactical_mobility: `<img class="stat-ico" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAACC0lEQVR42u3aPUsDQRCA4TdLrLWysLISK1tR0p7YiI2trVjYCpoTTGGSP2DpL7CysxUESwsrW0FsbGKhhSCxOjhjcnsf+zG3yUAggXB3T+a4ncwOzCLsaCRvBm9PQ0/X8Aq0gJeM71wAn0C/7EkWltYAaHr+wd+BKAc2Tn3uVzmh8oj9ALaB5wLYHnBaR/AXsAM8FsAaQfsAfwN7wH0JbGW0a/APsA/cVsCm0W3J4CFwCFwbwCbRLYp2CT4GrgxiS6Gb49ZkD1EWm0Ynt7nYZckUtlCmVSDY3GgVEDYXWo08RU29Yk9YLdpGhs9SDxEf2Ey0ChQ7Ea0Cxo5Fq8Cx/2oMNQXYP9dXtQEQa6obUdiqGa4d1mYtLRJrax0Wi7UBFo01DRaPLVJLxyFg82a4VutsVXBQWB04OGxWpaU7WLdMi9Q3dlKGg8WOy7CuXKw1djTDwWNHMywZG+fpOZtah4PB5gEHhdWBg8PqwD73mgDubBw0C9ym4jxFxTh3DfaN3gI2XYN9ozs+wD7RkeksF+l4+EJ3fIETdK/OWVZS1kdXWVaSigJNlnV70gPgBli31bX0kemsmAd2gQcyhtaUxPLPwF3bA05s9aUlopO/u5GtRrxEdAO4BOZs7TxIRK8ABzb3liSij2zvHkpDrwIbtgfTpKEjF5N4ktAtV6OHUtDLLmctJaAXmcWUxC/8eqtUJS2bRQAAAABJRU5ErkJggg==" alt="Mobility" />`,
  tactical_utility: `<img class="stat-ico" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAA9CAYAAAAeYmHpAAACYklEQVR42u3aP2gUQRTH8e+dWliIr36toFYDdrZ2ptBOxMbGSiWFIIKgVtFKECsbJUSSCCIIaqEhGEEURKOwjRDFSJS1CMgG/5Bc7jwLVxCx2Nnb2X2H86tn3t3n3jB7u7MQ83+kVXRgliZ9w45VUbe56OC2R+F1w+ivPoN90Jlh9JdQ6M+G0Vko9JJh9PtQ6HeG0Quh0K8No9+EQs8bRr8MhX4OrBrdxJIgaFG3BjwziH4i6nqhOg3w0CB61neCL/quMXAfuBUULepeAW8NoZ+Kuo+hOw0wYQh9o8ykMuhrQMfITcZULWhR9wm4aQA9LuqyujoNcDnfRJrKOnCp7ORSaFH3ArjTcJcXa0XnOQf8aAC8BowNUqA0WtQlwHgD6Iui7kMj6Dyna36isgRcGLTIQGhRtwycqhF9XNR9bxSd5ypwv6bN614VhQZGi7o+cARYDgheBE5UVayKTiPqUuAg0AsA7gAHRN2KKXQOnwNOBkCPirr5Rk44PE5CJoDDFZW7IuqOVf0d2wE6cxR4VEGd28AoTZ5leXZ7CzAD7C5ZYgbYJ+o6Q4PO4VuBOWCX59THwN4qrsd1Lu/fG9sKsAe/52oPgJGQ4KDoP+AjwGSB4ZPAflH3DSvn0wMu9VaBO7J2/kcneNp1fEgRTF3g2tDWEtERHdERHdERHdERHdERHdERPbzoLE12ZmkyVWDc9SxNtmPpJfcyWOAMcMjjx+0B08CYqFsYGnSWJjuAs57Yv9Pl10s0QfAtY9h/4aeB81Xiq0R3gQ2BVmRX1G2yuJGFAgNsjJesiG522WwjJsZUfgJeJpbt9oGkLgAAAABJRU5ErkJggg==" alt="Utility" />`,
  tactical_difficulty: `<img class="stat-ico" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAA9CAYAAAAeYmHpAAABbklEQVR4nO2a0RECIQxEuW0hBViD/RdhDRZwNei/MwoBsptzst+E3aeeHIHWSqVSqVQa1vl8vJpIUAKrwME2/ARVgINp9g2QDQ6WUQ+MCQ6GySgQCxzRBl4QBjgiJ/8FYLf7MVOXGvocAFaBQ/0NK8CR4SfNBkeGZ5gNjgzAbHBkAWaCI+OyFA2OleLV4CpwzBbuCqwAx0zR7qBscHgLogIyweEZHB2MBY7RgaxADB9kCcL0gzqAwhcq4xFF+YNt6FVEDuye0Puu3VNEDrANPYryh8pY6Qt1AIUfsgRh+iBTINYHC8/gyGDMRwjegp4Rsxs6+5+BmaKeIaPvvbI6YLawZxx5wrG6HB5tg3YHjH7xweoEWfbTkma/CTsn0mMdE/TIUhzgGbEbmuqo1gh975SH8hZ4wrGqowVrppMSCUy5aLNzl3WpK1W2YZd1yctztrDLuvQ1SZvYZf3FhVhz7LL+TqfwvnepVCqV2gX1BtaophSeq5F2AAAAAElFTkSuQmCC" alt="Difficulty" />`
};

// ==========================================================================
// Initialization & IPC Handlers
// ==========================================================================

function initWiki() {
  if (WIKI_STATE.initialized) return;
  WIKI_STATE.initialized = true;

  if (typeof LOL_DATA !== 'undefined' && LOL_DATA.version) {
    WIKI_STATE.patch = LOL_DATA.version;
  }

  // Request cached/fresh data from C# backend
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage('get-wiki-champions:' + WIKI_STATE.patch);
    window.chrome.webview.postMessage('get-wiki-items:' + WIKI_STATE.patch);
    window.chrome.webview.postMessage('get-wiki-runes:' + WIKI_STATE.patch);

    // Timeout fallback: if C# does not populate within 2.5 seconds, direct load
    setTimeout(() => {
      if (WIKI_STATE.champions.length === 0) loadWikiChampionsDirect();
      if (WIKI_STATE.items.length === 0) loadWikiItemsDirect();
      if (WIKI_STATE.runes.length === 0) loadWikiRunesDirect();
    }, 2500);
  } else {
    // Fallback: Direct CDN fetch or use LOL_DATA
    loadWikiChampionsDirect();
    loadWikiItemsDirect();
    loadWikiRunesDirect();
  }
}

function handleWikiIpcMessage(data) {
  if (!data) return;
  if (data.wikiType === 'champions') {
    if (data.success !== false && data.data && data.data.data && Object.keys(data.data.data).length > 0) {
      processChampionsData(data.data.data);
    } else if (data.success !== false && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
      processChampionsData(data.data);
    } else {
      loadWikiChampionsDirect();
    }
  } else if (data.wikiType === 'champion-detail') {
    if (WIKI_STATE._detailTimeout) clearTimeout(WIKI_STATE._detailTimeout);
    if (data.success !== false && data.data && data.data.data && data.champId) {
      const champDetail = data.data.data[data.champId];
      if (champDetail) {
        WIKI_STATE.champDetailCache[data.champId] = champDetail;
        if (WIKI_STATE.activeChampModalId === data.champId) {
          renderChampionDetailModal(champDetail);
        }
        return;
      }
    }
    if (data.champId && WIKI_STATE.activeChampModalId === data.champId) {
      fetchDirectChampionDetail(data.champId);
    }
  } else if (data.wikiType === 'items') {
    if (data.success !== false && data.data && data.data.data && Object.keys(data.data.data).length > 0) {
      processItemsData(data.data.data);
    } else if (data.success !== false && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
      processItemsData(data.data);
    } else {
      loadWikiItemsDirect();
    }
  } else if (data.wikiType === 'runes') {
    if (data.success !== false && Array.isArray(data.data) && data.data.length > 0) {
      processRunesData(data.data);
    } else {
      loadWikiRunesDirect();
    }
  }
}

// Fallback CDN fetchers & Offline synthesizers
function loadWikiChampionsDirect() {
  fetch('https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/data/en_US/champion.json')
    .then(r => {
      if (!r.ok) throw new Error('Champions fetch failed');
      return r.json();
    })
    .then(json => {
      if (json && json.data && Object.keys(json.data).length > 0) {
        processChampionsData(json.data);
      } else {
        throw new Error('Empty champion data');
      }
    })
    .catch(() => {
      loadChampionsFromOfflineData();
    });
}

function loadChampionsFromOfflineData() {
  if (typeof LOL_DATA !== 'undefined' && LOL_DATA.champions) {
    const mockMap = {};
    LOL_DATA.champions.forEach(c => {
      mockMap[c.id] = {
        id: c.id,
        name: c.name,
        title: c.title || '',
        tags: c.roles || [],
        lanes: c.lanes || [],
        info: { attack: 6, defense: 5, magic: 5, difficulty: 5 },
        image: { full: c.id + '.png' },
        stats: { hp: 600, mp: 350, attackdamage: 60, armor: 30, spellblock: 30, movespeed: 335, attackrange: 175 }
      };
    });
    processChampionsData(mockMap);
  }
}

function loadWikiItemsDirect() {
  fetch('https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/data/en_US/item.json')
    .then(r => {
      if (!r.ok) throw new Error('Items fetch failed');
      return r.json();
    })
    .then(json => {
      if (json && json.data && Object.keys(json.data).length > 0) {
        processItemsData(json.data);
      } else {
        throw new Error('Empty item data');
      }
    })
    .catch(() => {
      loadItemsFromOfflineData();
    });
}

function loadItemsFromOfflineData() {
  if (typeof LOL_DATA === 'undefined') return;
  const mockItems = {};

  if (Array.isArray(LOL_DATA.items)) {
    LOL_DATA.items.forEach(it => {
      mockItems[String(it.id)] = {
        id: String(it.id),
        name: it.name,
        gold: { total: 3000, base: 1000, purchasable: true },
        tags: ['Damage', 'Lane'],
        plaintext: 'Hextech Legendary Item',
        description: 'Grants powerful combat attributes and unique passive enhancements.',
        image: { full: it.id + '.png' },
        maps: { '11': true, '12': true },
        inStore: true
      };
    });
  }

  if (Array.isArray(LOL_DATA.boots)) {
    LOL_DATA.boots.forEach(b => {
      mockItems[String(b.id)] = {
        id: String(b.id),
        name: b.name,
        gold: { total: 1100, base: 800, purchasable: true },
        tags: ['Boots', 'MovementSpeed'],
        plaintext: 'Enhanced Movement Speed Boots',
        description: 'Increases movement speed and secondary mobility stats.',
        image: { full: b.id + '.png' },
        maps: { '11': true, '12': true },
        inStore: true
      };
    });
  }

  if (Array.isArray(LOL_DATA.starters)) {
    LOL_DATA.starters.forEach(s => {
      const isAram = s.mode === 'aram';
      mockItems[String(s.id)] = {
        id: String(s.id),
        name: s.name,
        gold: { total: 450, base: 450, purchasable: true },
        tags: ['Lane', 'Starter'],
        plaintext: 'Early Game Starter Equipment',
        description: 'Essential early game lane sustain and basic attributes.',
        image: { full: s.id + '.png' },
        maps: { '11': !isAram, '12': isAram || true },
        inStore: true
      };
    });
  }

  processItemsData(mockItems);
}

function loadWikiRunesDirect() {
  fetch('https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/data/en_US/runesReforged.json')
    .then(r => {
      if (!r.ok) throw new Error('Runes fetch failed');
      return r.json();
    })
    .then(json => {
      if (Array.isArray(json) && json.length > 0) {
        processRunesData(json);
      } else {
        throw new Error('Empty runes data');
      }
    })
    .catch(() => {
      if (typeof LOL_DATA !== 'undefined' && LOL_DATA.runes) {
        processRunesData(LOL_DATA.runes);
      }
    });
}

// ==========================================================================
// Sub-Tab Navigation
// ==========================================================================

function switchWikiSubTab(subTab) {
  WIKI_STATE.currentSubTab = subTab;
  const tabs = ['champions', 'items', 'runes'];

  tabs.forEach(t => {
    const btn = document.getElementById('wikiSubNav' + t.charAt(0).toUpperCase() + t.slice(1));
    const section = document.getElementById('wikiSection' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('active', t === subTab);
    if (section) section.classList.toggle('active', t === subTab);
  });

  if (subTab === 'champions') {
    if (WIKI_STATE.champions.length === 0) initWiki();
    else filterAndRenderChampions();
  } else if (subTab === 'items') {
    if (WIKI_STATE.items.length === 0) initWiki();
    else filterAndRenderItems();
  } else if (subTab === 'runes') {
    if (WIKI_STATE.runes.length === 0) initWiki();
    else renderRunesPath(WIKI_STATE.activeRunePathId);
  }
}

// ==========================================================================
// Champions Wiki Logic
// ==========================================================================

function processChampionsData(dataObj) {
  if (!dataObj || Object.keys(dataObj).length === 0) {
    loadChampionsFromOfflineData();
    return;
  }

  WIKI_STATE.championsMap = dataObj;
  const list = Object.keys(dataObj).map(k => dataObj[k]);

  if (typeof LOL_DATA !== 'undefined' && LOL_DATA.champions) {
    const laneMap = {};
    LOL_DATA.champions.forEach(c => { laneMap[c.id] = c.lanes || []; });
    list.forEach(c => { c.lanes = laneMap[c.id] || []; });
  }

  WIKI_STATE.champions = list;
  const badge = document.getElementById('wikiChampCountBadge');
  if (badge) badge.innerText = list.length + ' Champions';
  filterAndRenderChampions();
}

const WIKI_ROLE_ICONS = {
  'fighter': { file: 'role-fighter.png', cdn: 'class-icon-fighter.png', label: 'Fighter' },
  'mage': { file: 'role-mage.png', cdn: 'class-icon-mage.png', label: 'Mage' },
  'assassin': { file: 'role-assassin.png', cdn: 'class-icon-assassin.png', label: 'Assassin' },
  'marksman': { file: 'role-marksman.png', cdn: 'class-icon-marksman.png', label: 'Marksman' },
  'tank': { file: 'role-tank.png', cdn: 'class-icon-tank.png', label: 'Tank' },
  'support': { file: 'role-support.png', cdn: 'class-icon-support.png', label: 'Support' }
};

const WIKI_LANE_ICONS = {
  'top': { file: 'icon-top.png', cdn: 'icon-position-top.png', label: 'Top' },
  'jungle': { file: 'icon-jungle.png', cdn: 'icon-position-jungle.png', label: 'Jungle' },
  'mid': { file: 'icon-middle.png', cdn: 'icon-position-middle.png', label: 'Mid' },
  'middle': { file: 'icon-middle.png', cdn: 'icon-position-middle.png', label: 'Mid' },
  'adc': { file: 'icon-bottom.png', cdn: 'icon-position-bottom.png', label: 'ADC' },
  'bot': { file: 'icon-bottom.png', cdn: 'icon-position-bottom.png', label: 'ADC' },
  'bottom': { file: 'icon-bottom.png', cdn: 'icon-position-bottom.png', label: 'ADC' },
  'support': { file: 'icon-utility.png', cdn: 'icon-position-utility.png', label: 'Support' },
  'utility': { file: 'icon-utility.png', cdn: 'icon-position-utility.png', label: 'Support' }
};

function filterAndRenderChampions() {
  const container = document.getElementById('wikiChampionsGrid');
  if (!container) return;

  const q = (WIKI_STATE.champFilters.search || '').trim().toLowerCase();
  const role = WIKI_STATE.champFilters.role || 'all';
  const lane = WIKI_STATE.champFilters.lane || 'all';
  const sort = WIKI_STATE.champFilters.sort || 'name';

  let filtered = WIKI_STATE.champions.filter(c => {
    if (q) {
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchId = (c.id || '').toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchId) return false;
    }
    if (role !== 'all') {
      const tags = c.tags || [];
      if (!tags.some(t => t.toLowerCase() === role.toLowerCase())) return false;
    }
    if (lane !== 'all') {
      const lanes = c.lanes || [];
      if (!lanes.some(l => l.toLowerCase() === lane.toLowerCase())) return false;
    }
    return true;
  });

  if (sort === 'name_desc') {
    filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
  } else {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const badge = document.getElementById('wikiChampCountBadge');
  if (badge) badge.innerText = filtered.length + ' / ' + WIKI_STATE.champions.length + ' Champions';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="wiki-empty-state">
        <div class="wiki-empty-icon">🛡️</div>
        <div class="wiki-empty-title">No Champions Found</div>
        <div class="wiki-empty-sub">Try adjusting your search query or role filter.</div>
      </div>
    `;
    return;
  }

  const html = filtered.map(c => {
    const iconUrl = 'https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/img/champion/' + c.id + '.png';
    const rolesHtml = (c.tags || []).map(t => {
      const key = (t || '').toLowerCase();
      const meta = WIKI_ROLE_ICONS[key];
      if (meta) {
        return `<span class="wiki-role-icon-badge role-${key}" title="Role: ${meta.label}"><img src="assets/icons/${meta.file}" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/${meta.cdn}';}" alt="${meta.label}"></span>`;
      }
      return `<span class="wiki-role-badge role-${key}">${t}</span>`;
    }).join('');

    const lanesHtml = (c.lanes && c.lanes.length > 0)
      ? c.lanes.map(l => {
          const key = (l || '').toLowerCase();
          const meta = WIKI_LANE_ICONS[key];
          if (meta) {
            return `<span class="wiki-lane-icon-badge" title="Lane: ${meta.label}"><img src="assets/icons/${meta.file}" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/${meta.cdn}';}" alt="${meta.label}"></span>`;
          }
          return `<span class="wiki-lane-tag">${l}</span>`;
        }).join('')
      : '';

    return `
      <div class="wiki-champ-card" onclick="openChampionWikiModal('${c.id}')" title="${c.name} - ${c.title}">
        <div class="wiki-champ-avatar-wrap">
          <img class="wiki-champ-avatar" src="${iconUrl}" alt="${c.name}" loading="lazy" onerror="this.src='assets/app.png'">
          <div class="wiki-champ-card-overlay"></div>
        </div>
        <div class="wiki-champ-card-body">
          <div class="wiki-champ-name">${c.name}</div>
          <div class="wiki-champ-title">${c.title}</div>
          <div class="wiki-champ-badges">
            <div class="wiki-badge-group wiki-roles-group">${rolesHtml}</div>
            ${lanesHtml ? `<div class="wiki-badge-group wiki-lanes-group">${lanesHtml}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

let _champSearchTimer = null;
function onWikiChampSearch(val) {
  WIKI_STATE.champFilters.search = val;
  if (_champSearchTimer) clearTimeout(_champSearchTimer);
  _champSearchTimer = setTimeout(() => {
    filterAndRenderChampions();
  }, 100);
}

function setWikiChampRoleFilter(role) {
  WIKI_STATE.champFilters.role = role;
  document.querySelectorAll('.wiki-role-filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-role') === role);
  });
  filterAndRenderChampions();
}

function setWikiChampLaneFilter(lane) {
  WIKI_STATE.champFilters.lane = lane;
  document.querySelectorAll('.wiki-lane-filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lane') === lane);
  });
  filterAndRenderChampions();
}

function setWikiChampSort(sort) {
  WIKI_STATE.champFilters.sort = sort;
  filterAndRenderChampions();
}

// Champion Detail Modal
function openChampionWikiModal(champId) {
  WIKI_STATE.activeChampModalId = champId;
  const modal = document.getElementById('wikiChampDetailModal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.classList.add('modal-open');

  if (WIKI_STATE.champDetailCache[champId]) {
    renderChampionDetailModal(WIKI_STATE.champDetailCache[champId]);
    return;
  }

  const basic = WIKI_STATE.championsMap[champId] || { id: champId, name: champId, title: '' };
  renderChampionDetailSkeleton(basic);

  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage('get-wiki-champion-detail:' + champId + ':' + WIKI_STATE.patch);
    if (WIKI_STATE._detailTimeout) clearTimeout(WIKI_STATE._detailTimeout);
    WIKI_STATE._detailTimeout = setTimeout(() => {
      if (WIKI_STATE.activeChampModalId === champId && !WIKI_STATE.champDetailCache[champId]) {
        fetchDirectChampionDetail(champId);
      }
    }, 2200);
  } else {
    fetchDirectChampionDetail(champId);
  }
}

function fetchDirectChampionDetail(champId) {
  const basic = WIKI_STATE.championsMap[champId] || { id: champId, name: champId, title: '' };
  fetch('https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/data/en_US/champion/' + champId + '.json')
    .then(r => {
      if (!r.ok) throw new Error('Detail fetch failed');
      return r.json();
    })
    .then(json => {
      if (json && json.data && json.data[champId]) {
        WIKI_STATE.champDetailCache[champId] = json.data[champId];
        if (WIKI_STATE.activeChampModalId === champId) {
          renderChampionDetailModal(json.data[champId]);
        }
      } else {
        throw new Error('Invalid detail json');
      }
    })
    .catch(() => {
      if (WIKI_STATE.activeChampModalId === champId) {
        renderChampionDetailOffline(basic);
      }
    });
}

function closeChampionWikiModal() {
  WIKI_STATE.activeChampModalId = null;
  if (WIKI_STATE._detailTimeout) clearTimeout(WIKI_STATE._detailTimeout);
  const modal = document.getElementById('wikiChampDetailModal');
  if (modal) modal.classList.remove('active');
  if (!WIKI_STATE.activeItemModalId) {
    document.body.classList.remove('modal-open');
  }
}

function renderChampionDetailSkeleton(basic) {
  const body = document.getElementById('wikiChampDetailContent');
  if (!body) return;
  body.innerHTML = `
    <div class="wiki-modal-loading">
      <div class="wiki-hex-spinner"></div>
      <div style="font-family:Cinzel,serif;color:var(--gold);font-size:1.1rem;margin-top:12px;">LOADING ${basic.name.toUpperCase()}...</div>
    </div>
  `;
}

function renderChampionDetailOffline(basic) {
  const body = document.getElementById('wikiChampDetailContent');
  if (!body) return;

  const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${basic.id}_0.jpg`;
  const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${WIKI_STATE.patch}/img/champion/${basic.id}.png`;
  const regionCoverUrl = (typeof getChampionRegionCover === 'function') 
    ? getChampionRegionCover(basic.id, basic.name) 
    : 'assets/covers/runeterra.jpg';
  const regionName = (typeof getChampionRegionName === 'function') 
    ? getChampionRegionName(basic.id, basic.name) 
    : 'Runeterra';
  const regionCrestUrl = (typeof getChampionRegionCrest === 'function')
    ? getChampionRegionCrest(basic.id, basic.name)
    : 'assets/icons/crests/runeterra.png';

  const heroRolesHtml = (basic.tags || []).map(t => {
    const key = (t || '').toLowerCase();
    const meta = (typeof WIKI_ROLE_ICONS !== 'undefined' && WIKI_ROLE_ICONS[key]);
    if (meta) {
      return `<span class="wiki-role-icon-badge" title="Role: ${meta.label}"><img src="assets/icons/${meta.file}" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/${meta.cdn}';}" alt="${meta.label}"></span>`;
    }
    return `<span class="wiki-role-badge">${t}</span>`;
  }).join('');

  const cLanes = basic.lanes || (WIKI_STATE.championsMap[basic.id] && WIKI_STATE.championsMap[basic.id].lanes) || [];
  const heroLanesHtml = (cLanes && cLanes.length > 0)
    ? cLanes.map(l => {
        const key = (l || '').toLowerCase();
        const meta = (typeof WIKI_LANE_ICONS !== 'undefined' && WIKI_LANE_ICONS[key]);
        if (meta) {
          return `<span class="wiki-lane-icon-badge" title="Lane: ${meta.label}"><img src="assets/icons/${meta.file}" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/${meta.cdn}';}" alt="${meta.label}"></span>`;
        }
        return `<span class="wiki-lane-tag">${l}</span>`;
      }).join('')
    : '';

  body.innerHTML = `
    <div class="wiki-champ-hero" id="wikiChampSplashHero" style="background-image: linear-gradient(to bottom, rgba(1,10,19,0.3) 0%, rgba(1,10,19,0.88) 70%, #010a13 100%), url('${regionCoverUrl}'), url('${splashUrl}');">
      <div class="wiki-hero-crest-watermark-wrap" title="${regionName}">
        <img class="wiki-hero-crest-watermark" src="${regionCrestUrl}" alt="${regionName}" onerror="this.style.display='none';">
      </div>
      <div class="wiki-champ-hero-content">
        <img class="wiki-hero-avatar" src="${iconUrl}" alt="${basic.name}" onerror="this.src='assets/app.png'">
        <div class="wiki-hero-text">
          <div class="wiki-hero-title-wrap">
            <h1 class="wiki-hero-name">${basic.name}</h1>
            <span class="wiki-hero-title">${basic.title || 'League Champion'}</span>
          </div>
          <div class="wiki-hero-tags">
            ${regionName ? `
              <span class="wiki-region-tag" title="Region: ${regionName}">
                <img class="wiki-hero-crest-mini" src="${regionCrestUrl}" alt="${regionName}" onerror="this.style.display='none';">
                <span>${regionName}</span>
              </span>
            ` : ''}
            <div class="wiki-hero-badges-group" title="Roles">${heroRolesHtml}</div>
            ${heroLanesHtml ? `<div class="wiki-hero-badges-group" title="Lanes">${heroLanesHtml}</div>` : ''}
            <span class="wiki-partype-tag">Offline Archive</span>
          </div>
        </div>
      </div>
    </div>

    <div class="wiki-champ-modal-scroll">
      <div class="wiki-section-box">
        <div class="wiki-section-box-title">DATA STATUS</div>
        <div class="wiki-champ-lore" style="color:var(--gold-2);background:rgba(200,170,110,0.08);padding:14px 16px;border:1px solid rgba(200,170,110,0.2);border-radius:3px;">
          ℹ️ <b>Offline Mode Active:</b> Base champion data loaded from local storage. Connect to the internet to load full ability tooltips, damage scaling ratios, cooldowns, and full skin splash gallery.
        </div>
      </div>
    </div>
  `;
}

function formatSpellDescription(s) {
  if (!s) return '';
  const desc = (s.description || '').trim();
  let tooltip = (s.tooltip || '').trim();

  // 1. Remove raw game engine modifiers
  tooltip = tooltip.replace(/\{\{\s*spellmodifier[^\}]*\}\}/gi, '');

  // 2. Substitute effectBurn arrays: {{ e1 }}, {{ e2 }} etc.
  const effects = s.effectBurn || [];
  tooltip = tooltip.replace(/\{\{\s*e(\d+)\s*\}\}/gi, (m, g1) => {
    const idx = parseInt(g1, 10);
    return (effects[idx] && effects[idx] !== '') ? `<b class="hex-num">${effects[idx]}</b>` : '';
  });

  // 3. Format sub-abilities tags like <spellName>Devastating Fire</spellName>
  tooltip = tooltip.replace(/<spellName>(.*?)<\/spellName>/gi, '<br><b class="hex-spell-subname" style="color:var(--gold-1);letter-spacing:0.5px;">• $1:</b> ');

  // 4. Strip any remaining unresolved template placeholders like {{ totaldamage }}, {{ qdamagecalc }}
  tooltip = tooltip.replace(/\{\{[^\}]*\}\}/g, '');
  tooltip = tooltip.replace(/\s{2,}/g, ' ').trim();

  // If tooltip is essentially empty or short, return clean description
  if (!tooltip || tooltip.length < 15) {
    return formatRiotMarkup(desc);
  }

  // If description is distinct from tooltip, display the clear summary first
  if (desc && !tooltip.toLowerCase().startsWith(desc.toLowerCase().substring(0, 30))) {
    return `
      <div class="wiki-spell-summary">${formatRiotMarkup(desc)}</div>
      <div class="wiki-spell-details">${formatRiotMarkup(tooltip)}</div>
    `;
  }

  return formatRiotMarkup(tooltip || desc);
}

function renderChampionDetailModal(c) {
  const body = document.getElementById('wikiChampDetailContent');
  if (!body) return;

  const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${c.id}_0.jpg`;
  const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${WIKI_STATE.patch}/img/champion/${c.id}.png`;
  const regionCoverUrl = (typeof getChampionRegionCover === 'function') 
    ? getChampionRegionCover(c.id, c.name) 
    : splashUrl;
  const regionName = (typeof getChampionRegionName === 'function') 
    ? getChampionRegionName(c.id, c.name) 
    : '';
  const regionCrestUrl = (typeof getChampionRegionCrest === 'function')
    ? getChampionRegionCrest(c.id, c.name)
    : 'assets/icons/crests/runeterra.png';

  const heroRolesHtml = (c.tags || []).map(t => {
    const key = (t || '').toLowerCase();
    const meta = (typeof WIKI_ROLE_ICONS !== 'undefined' && WIKI_ROLE_ICONS[key]);
    if (meta) {
      return `<span class="wiki-role-icon-badge" title="Role: ${meta.label}"><img src="assets/icons/${meta.file}" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/${meta.cdn}';}" alt="${meta.label}"></span>`;
    }
    return `<span class="wiki-role-badge">${t}</span>`;
  }).join('');

  const cLanes = c.lanes || (WIKI_STATE.championsMap[c.id] && WIKI_STATE.championsMap[c.id].lanes) || [];
  const heroLanesHtml = (cLanes && cLanes.length > 0)
    ? cLanes.map(l => {
        const key = (l || '').toLowerCase();
        const meta = (typeof WIKI_LANE_ICONS !== 'undefined' && WIKI_LANE_ICONS[key]);
        if (meta) {
          return `<span class="wiki-lane-icon-badge" title="Lane: ${meta.label}"><img src="assets/icons/${meta.file}" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/${meta.cdn}';}" alt="${meta.label}"></span>`;
        }
        return `<span class="wiki-lane-tag">${l}</span>`;
      }).join('')
    : '';

  const ratings = (typeof getChampionTacticalRatings === 'function') 
    ? getChampionTacticalRatings(c.id, c.name) 
    : { damage: 2, toughness: 2, control: 1, mobility: 2, utility: 1, difficulty: 2 };

  const getRatingPips = (val, max = 3) => {
    const clamped = Math.max(0, Math.min(max, Number(val) || 0));
    let pips = '';
    for (let i = 1; i <= max; i++) {
      pips += `<span class="wiki-pip ${i <= clamped ? 'filled' : ''}"></span>`;
    }
    return `<div class="wiki-meter-pips" title="${clamped}/${max}">${pips}</div>`;
  };

  const st = c.stats || {};
  const passive = c.passive || {};
  const passiveImg = passive.image ? `https://ddragon.leagueoflegends.com/cdn/${WIKI_STATE.patch}/img/passive/${passive.image.full}` : '';
  const spells = c.spells || [];
  const keys = ['Q', 'W', 'E', 'R'];

  const spellsTabsHtml = `
    <button class="wiki-spell-tab active" onclick="selectWikiSpellTab(event, 'spell-P')">
      <img src="${passiveImg}" alt="Passive" onerror="this.src='assets/app.png'">
      <span class="spell-tab-key">P</span>
    </button>
    ${spells.map((s, idx) => {
      const sImg = s.image ? `https://ddragon.leagueoflegends.com/cdn/${WIKI_STATE.patch}/img/spell/${s.image.full}` : '';
      return `
        <button class="wiki-spell-tab" onclick="selectWikiSpellTab(event, 'spell-${idx}')">
          <img src="${sImg}" alt="${s.name}" onerror="this.src='assets/app.png'">
          <span class="spell-tab-key">${keys[idx] || (idx + 1)}</span>
        </button>
      `;
    }).join('')}
  `;

  const spellsPanesHtml = `
    <div class="wiki-spell-pane active" id="wikiSpellPane_P">
      <div class="wiki-spell-header">
        <img class="wiki-spell-icon" src="${passiveImg}" alt="${passive.name || 'Passive'}">
        <div class="wiki-spell-meta">
          <div class="wiki-spell-title-row">
            <span class="wiki-spell-key-badge">PASSIVE</span>
            <span class="wiki-spell-name">${passive.name || 'Innate'}</span>
          </div>
        </div>
      </div>
      <div class="wiki-spell-desc">${formatRiotMarkup(passive.description || '')}</div>
    </div>
    ${spells.map((s, idx) => {
      const sImg = s.image ? `https://ddragon.leagueoflegends.com/cdn/${WIKI_STATE.patch}/img/spell/${s.image.full}` : '';
      const cd = (s.cooldownBurn && s.cooldownBurn !== '0') ? s.cooldownBurn + 's' : 'No Cooldown';
      const cost = (s.costBurn && s.costBurn !== '0') ? s.costBurn + ' ' + (c.partype || 'Mana') : 'No Cost';
      const range = (s.rangeBurn && s.rangeBurn !== '0') ? s.rangeBurn : 'Self / Infinite';

      return `
        <div class="wiki-spell-pane" id="wikiSpellPane_${idx}">
          <div class="wiki-spell-header">
            <img class="wiki-spell-icon" src="${sImg}" alt="${s.name}">
            <div class="wiki-spell-meta">
              <div class="wiki-spell-title-row">
                <span class="wiki-spell-key-badge">${keys[idx]}</span>
                <span class="wiki-spell-name">${s.name}</span>
              </div>
              <div class="wiki-spell-costs">
                <span class="wiki-spell-cost-item">${STAT_ICONS.haste} CD: <b>${cd}</b></span>
                <span class="wiki-spell-cost-item">${STAT_ICONS.mana} Cost: <b>${cost}</b></span>
                <span class="wiki-spell-cost-item">${STAT_ICONS.range} Range: <b>${range}</b></span>
              </div>
            </div>
          </div>
          <div class="wiki-spell-desc">${formatSpellDescription(s)}</div>
        </div>
      `;
    }).join('')}
  `;

  // Exclude chromas: Riot marks chromas with parentSkin
  const skins = (c.skins || []).filter(sk => sk.parentSkin == null && !sk.parentSkinId);
  WIKI_STATE.activeChampionSkins = skins;
  WIKI_STATE.activeChampionId = c.id;
  WIKI_STATE.activeChampionName = c.name;
  const skinsHtml = skins.map((sk, idx) => {
    const skinSplash = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${c.id}_${sk.num}.jpg`;
    // Use lightweight loading thumbnail (~35 KB) for gallery grid
    const skinThumb = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${c.id}_${sk.num}.jpg`;
    const displayName = sk.name === 'default' ? c.name : sk.name;
    const activeClass = idx === 0 ? 'active' : '';
    const safeSplash = encodeURI(skinSplash);
    const safeName = encodeURIComponent(displayName);
    return `
      <div class="wiki-skin-thumb ${activeClass}" 
           id="wikiSkinThumb_${idx}"
           data-skin-index="${idx}"
           data-splash="${safeSplash}" 
           data-name="${safeName}" 
           onclick="onWikiSkinCardClick(this)" 
           title="Click to view full splash: ${escapeHtml(displayName)}">
        <img src="${skinThumb}" 
             alt="${escapeHtml(displayName)}" 
             loading="lazy" 
             decoding="async" 
             onerror="this.onerror=null;this.src='${skinSplash}';">
        <span class="wiki-skin-name">${escapeHtml(displayName)}</span>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="wiki-champ-hero" id="wikiChampSplashHero" 
         data-active-splash="${splashUrl}" 
         data-active-name="${escapeHtml(c.name)}" 
         style="background-image: linear-gradient(to bottom, rgba(1,10,19,0.3) 0%, rgba(1,10,19,0.88) 70%, #010a13 100%), url('${regionCoverUrl}'), url('${splashUrl}');">
      <div class="wiki-hero-crest-watermark-wrap" title="${regionName}">
        <img class="wiki-hero-crest-watermark" src="${regionCrestUrl}" alt="${regionName}" onerror="this.style.display='none';">
      </div>
      <div class="wiki-champ-hero-content">
        <img class="wiki-hero-avatar" src="${iconUrl}" alt="${c.name}" onerror="this.src='assets/app.png'">
        <div class="wiki-hero-text">
          <div class="wiki-hero-title-wrap">
            <h1 class="wiki-hero-name">${c.name}</h1>
            <span class="wiki-hero-title">${c.title}</span>
            <span class="wiki-hero-skin-badge" id="wikiHeroSkinBadge" style="display:none;"></span>
          </div>
          <div class="wiki-hero-tags">
            ${regionName ? `
              <span class="wiki-region-tag" title="Region: ${regionName}">
                <img class="wiki-hero-crest-mini" src="${regionCrestUrl}" alt="${regionName}" onerror="this.style.display='none';">
                <span>${regionName}</span>
              </span>
            ` : ''}
            <div class="wiki-hero-badges-group" title="Roles">${heroRolesHtml}</div>
            ${heroLanesHtml ? `<div class="wiki-hero-badges-group" title="Lanes">${heroLanesHtml}</div>` : ''}
            <span class="wiki-partype-tag">${c.partype || 'Mana'}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="wiki-champ-modal-scroll">
      <!-- Lore Blurb -->
      <div class="wiki-section-box">
        <div class="wiki-section-box-title">BIOGRAPHY &amp; LORE</div>
        <div class="wiki-champ-lore">${c.lore || c.blurb || 'No lore recorded in archive.'}</div>
      </div>

      <!-- Tactical & Base Stats Grid -->
      <div class="wiki-stats-split-grid">
        <!-- Tactical Ratings -->
        <div class="wiki-section-box">
          <div class="wiki-section-box-title">TACTICAL RATINGS</div>
          <div class="wiki-ratings-list">
            <div class="wiki-rating-item">
              <span class="wiki-rating-label">${STAT_ICONS.tactical_damage} Damage</span>
              ${getRatingPips(ratings.damage)}
              <span class="wiki-rating-val">${ratings.damage}/3</span>
            </div>
            <div class="wiki-rating-item">
              <span class="wiki-rating-label">${STAT_ICONS.tactical_toughness} Toughness</span>
              ${getRatingPips(ratings.toughness)}
              <span class="wiki-rating-val">${ratings.toughness}/3</span>
            </div>
            <div class="wiki-rating-item">
              <span class="wiki-rating-label">${STAT_ICONS.tactical_control} Control</span>
              ${getRatingPips(ratings.control)}
              <span class="wiki-rating-val">${ratings.control}/3</span>
            </div>
            <div class="wiki-rating-item">
              <span class="wiki-rating-label">${STAT_ICONS.tactical_mobility} Mobility</span>
              ${getRatingPips(ratings.mobility)}
              <span class="wiki-rating-val">${ratings.mobility}/3</span>
            </div>
            <div class="wiki-rating-item">
              <span class="wiki-rating-label">${STAT_ICONS.tactical_utility} Utility</span>
              ${getRatingPips(ratings.utility)}
              <span class="wiki-rating-val">${ratings.utility}/3</span>
            </div>
            <div class="wiki-rating-item">
              <span class="wiki-rating-label">${STAT_ICONS.tactical_difficulty} Difficulty</span>
              ${getRatingPips(ratings.difficulty)}
              <span class="wiki-rating-val">${ratings.difficulty}/3</span>
            </div>
          </div>
        </div>

        <!-- Base Stats -->
        <div class="wiki-section-box">
          <div class="wiki-section-box-title">BASE ATTRIBUTES</div>
          <div class="wiki-base-stats-grid">
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.health} Health</span>
              <span class="st-val">${st.hp || 0} <small class="st-grow">(+${st.hpperlevel || 0})</small></span>
            </div>
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.mana} ${c.partype || 'Mana'}</span>
              <span class="st-val">${st.mp || 0} <small class="st-grow">(+${st.mpperlevel || 0})</small></span>
            </div>
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.hpregen} Health Regen</span>
              <span class="st-val">${st.hpregen || 0} <small class="st-grow">(+${st.hpregenperlevel || 0})</small></span>
            </div>
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.ad} Attack Damage</span>
              <span class="st-val">${st.attackdamage || 0} <small class="st-grow">(+${st.attackdamageperlevel || 0})</small></span>
            </div>
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.armor} Armor</span>
              <span class="st-val">${st.armor || 0} <small class="st-grow">(+${st.armorperlevel || 0})</small></span>
            </div>
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.mr} Magic Resist</span>
              <span class="st-val">${st.spellblock || 0} <small class="st-grow">(+${st.spellblockperlevel || 0})</small></span>
            </div>
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.as} Attack Speed</span>
              <span class="st-val">${st.attackspeed ? st.attackspeed.toFixed(3) : 0.625} <small class="st-grow">(+${st.attackspeedperlevel || 0}%)</small></span>
            </div>
            <div class="wiki-stat-cell">
              <span class="st-label">${STAT_ICONS.move} Move Speed</span>
              <span class="st-val">${st.movespeed || 330}</span>
            </div>
            <div class="wiki-stat-cell" style="grid-column: span 2;">
              <span class="st-label">${STAT_ICONS.range} Attack Range</span>
              <span class="st-val">${st.attackrange || 125} units</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Abilities Showcase -->
      <div class="wiki-section-box">
        <div class="wiki-section-box-title">ABILITIES &amp; KIT</div>
        <div class="wiki-spells-tab-bar">
          ${spellsTabsHtml}
        </div>
        <div class="wiki-spells-content">
          ${spellsPanesHtml}
        </div>
      </div>

      <!-- Skins Gallery -->
      ${skins.length > 0 ? `
        <div class="wiki-section-box">
          <div class="wiki-section-box-title">SKINS GALLERY (${skins.length})</div>
          <div class="wiki-skins-gallery-wrap">
            <button class="wiki-skins-nav-btn prev" onclick="navigateWikiSkinCarousel(-1)" title="Previous Skins">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div class="wiki-skins-gallery" id="wikiSkinsGallery">
              ${skinsHtml}
            </div>
            <button class="wiki-skins-nav-btn next" onclick="navigateWikiSkinCarousel(1)" title="Next Skins">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function navigateWikiSkinCarousel(dir) {
  const gallery = document.getElementById('wikiSkinsGallery');
  if (!gallery) return;
  gallery.scrollBy({ left: 260 * dir, behavior: 'smooth' });
}

function selectWikiSpellTab(e, paneId) {
  const btn = e.currentTarget;
  document.querySelectorAll('.wiki-spell-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.wiki-spell-pane').forEach(p => p.classList.remove('active'));

  btn.classList.add('active');
  const target = document.getElementById('wikiSpellPane_' + paneId.replace('spell-', ''));
  if (target) target.classList.add('active');
}

function onWikiSkinCardClick(elem) {
  if (!elem) return;
  const splashUrl = decodeURI(elem.getAttribute('data-splash') || '');
  const skinName = decodeURIComponent(elem.getAttribute('data-name') || '');
  const idx = parseInt(elem.getAttribute('data-skin-index') || '0', 10);
  previewWikiSkin(splashUrl, skinName, elem, true, idx);
}

function previewWikiSkin(splashUrl, skinName, elem, openLightbox = false, idx = -1) {
  const hero = document.getElementById('wikiChampSplashHero');
  if (hero) {
    hero.setAttribute('data-active-splash', splashUrl);
    hero.setAttribute('data-active-name', skinName);
  }
  document.querySelectorAll('.wiki-skin-thumb').forEach(t => t.classList.remove('active'));
  if (elem) {
    elem.classList.add('active');
    if (typeof elem.scrollIntoView === 'function') {
      elem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  const badge = document.getElementById('wikiHeroSkinBadge');
  if (badge) {
    badge.innerText = 'Skin: ' + skinName;
    badge.style.display = 'inline-block';
  }

  if (openLightbox && typeof openImageLightbox === 'function') {
    const galleryItems = (WIKI_STATE.activeChampionSkins || []).map((sk, sIdx) => {
      const champId = WIKI_STATE.activeChampionId || '';
      return {
        src: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champId}_${sk.num}.jpg`,
        caption: (sk.name === 'default' ? (WIKI_STATE.activeChampionName || champId) : sk.name),
        skinIndex: sIdx
      };
    });
    const curIndex = idx >= 0 ? idx : ((elem && parseInt(elem.getAttribute('data-skin-index'), 10)) || 0);
    openImageLightbox(splashUrl, skinName, galleryItems, curIndex);
  }
}

function openWikiActiveSplash() {
  const hero = document.getElementById('wikiChampSplashHero');
  const splash = (hero && hero.getAttribute('data-active-splash')) || '';
  const name = (hero && hero.getAttribute('data-active-name')) || 'Champion Splash';
  if (splash && typeof openImageLightbox === 'function') {
    const galleryItems = (WIKI_STATE.activeChampionSkins || []).map((sk, sIdx) => {
      const champId = WIKI_STATE.activeChampionId || '';
      return {
        src: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champId}_${sk.num}.jpg`,
        caption: (sk.name === 'default' ? (WIKI_STATE.activeChampionName || champId) : sk.name),
        skinIndex: sIdx
      };
    });
    const foundIdx = galleryItems.findIndex(g => g.src === splash || g.caption === name);
    openImageLightbox(splash, name, galleryItems, foundIdx >= 0 ? foundIdx : 0);
  }
}

function bridgeWikiChampionToSolo(champId) {
  closeChampionWikiModal();
  switchAppTab('randomizer');
  if (typeof window.rollSoloLoadout === 'function') {
    window.rollSoloLoadout(champId);
  }
}

// ==========================================================================
// ==========================================================================
// Items Wiki Logic (Authentic LoL In-Game Shop Implementation)
// ==========================================================================

function determineItemRoles(item) {
  const tags = (item.tags || []).map(t => t.toLowerCase());
  const desc = (item.description || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const st = item.stats || {};
  const roles = new Set();

  const hasAd = tags.includes('damage') || desc.includes('attack damage') || (st.FlatPhysicalDamageMod && st.FlatPhysicalDamageMod > 0);
  const hasAp = tags.includes('spelldamage') || desc.includes('ability power') || (st.FlatMagicDamageMod && st.FlatMagicDamageMod > 0);
  const hasCrit = tags.includes('criticalstrike') || desc.includes('critical strike') || (st.FlatCritChanceMod && st.FlatCritChanceMod > 0);
  const hasAs = tags.includes('attackspeed') || desc.includes('attack speed') || (st.PercentAttackSpeedMod && st.PercentAttackSpeedMod > 0);
  const hasLethality = tags.includes('armorpenetration') || desc.includes('lethality') || desc.includes('armor penetration');
  const hasHp = tags.includes('health') || desc.includes('health') || (st.FlatHPPoolMod && st.FlatHPPoolMod > 0);
  const hasArmor = tags.includes('armor') || desc.includes('armor') || (st.FlatArmorMod && st.FlatArmorMod > 0);
  const hasMr = tags.includes('spellblock') || desc.includes('magic resist') || (st.FlatSpellBlockMod && st.FlatSpellBlockMod > 0);
  const hasHaste = tags.includes('abilityhaste') || tags.includes('cooldownreduction') || desc.includes('ability haste') || desc.includes('haste');
  const hasMana = tags.includes('mana') || tags.includes('manaregen') || desc.includes('mana');
  const hasVamp = tags.includes('lifesteal') || tags.includes('spellvamp') || desc.includes('omnivamp') || desc.includes('life steal');
  const isSupport = tags.includes('goldper') || tags.includes('aura') || desc.includes('heal and shield power') || tags.includes('vision') || name.includes('atlas') || name.includes('sleigh') || name.includes('bloodsong') || name.includes('opposition') || name.includes('dream maker') || name.includes('realmspike') || name.includes('helia') || name.includes('moonstone') || name.includes('redemption') || name.includes('mikael') || name.includes('censer') || name.includes('flowing water') || name.includes('dawncore') || name.includes('knight\'s vow') || name.includes('zeke') || name.includes('mandate') || name.includes('shurelya') || name.includes('locket');

  // Fighter (Bruiser)
  if ((hasAd && (hasHp || hasHaste || hasVamp) && !hasLethality) || tags.includes('fighter')) roles.add('fighter');
  if (['trinity force', 'black cleaver', 'sundered sky', 'sterak', "death's dance", 'ravenous hydra', 'stridebreaker', 'shojin', 'maw of malmortius', 'eclipse', 'hullbreaker', 'chempunk', 'blade of the ruined king', 'titanic hydra', 'overlord', 'hexplate', 'terminus'].some(x => name.includes(x))) roles.add('fighter');

  // Marksman (ADC)
  if (hasCrit || (hasAs && hasAd) || tags.includes('criticalstrike') || tags.includes('onhit')) roles.add('marksman');
  if (['infinity edge', 'kraken', 'phantom dancer', 'dominik', 'mortal reminder', 'runaan', 'rapid firecannon', 'collector', 'yun tal', 'essence reaver', 'shieldbow', 'statikk', 'navori', 'rageblade', 'ruined king'].some(x => name.includes(x))) roles.add('marksman');

  // Assassin
  if (hasLethality || (hasAd && desc.includes('lethality')) || desc.includes('armor penetration')) roles.add('assassin');
  if (['ghostblade', 'hubris', 'opportunity', 'cyclosword', 'profane', 'serylda', 'axiom', 'edge of night', 'serpent', 'umbral'].some(x => name.includes(x))) roles.add('assassin');

  // Mage
  if (hasAp || desc.includes('magic penetration') || tags.includes('magicpenetration') || (hasMana && hasHaste && !hasAd)) roles.add('mage');
  if (['deathcap', 'zhonya', 'shadowflame', 'luden', 'malignance', 'stormsurge', 'void staff', 'cryptbloom', 'archangel', 'seraph', 'horizon', 'cosmic', 'lich bane', 'nashor', 'blackfire', 'rod of ages', 'liandry', 'riftmaker', 'banshee', 'torch'].some(x => name.includes(x))) roles.add('mage');

  // Tank
  if (((hasArmor || hasMr) && hasHp) || (hasHp && !hasAd && !hasAp)) roles.add('tank');
  if (['heartsteel', 'sunfire', 'hollow', 'thornmail', 'randuin', 'frozen heart', 'force of nature', 'rookern', 'spirit visage', "jak'sho", 'warmog', 'unending despair', 'dead man', 'abyssal', 'iceborn'].some(x => name.includes(x))) roles.add('tank');

  // Support
  if (isSupport || (hasHp && hasHaste && (hasArmor || hasMr) && (item.gold?.total || 0) <= 2400)) roles.add('support');

  return Array.from(roles);
}

function getStatIconByName(key) {
  const k = key.toLowerCase();
  if (k.includes('attack damage') || k.includes('physical damage')) return STAT_ICONS.ad;
  if (k.includes('ability power') || k.includes('spell damage')) return STAT_ICONS.ap;
  if (k.includes('armor penetration') || k.includes('lethality')) return STAT_ICONS.lethality;
  if (k.includes('magic penetration')) return STAT_ICONS.mpen;
  if (k.includes('armor')) return STAT_ICONS.armor;
  if (k.includes('magic resist') || k.includes('spell block')) return STAT_ICONS.mr;
  if (k.includes('health regen') || k.includes('base health regen')) return STAT_ICONS.hpregen;
  if (k.includes('health')) return STAT_ICONS.health;
  if (k.includes('mana regen') || k.includes('base mana regen')) return STAT_ICONS.manaregen;
  if (k.includes('mana')) return STAT_ICONS.mana;
  if (k.includes('attack speed')) return STAT_ICONS.as;
  if (k.includes('critical strike') || k.includes('crit')) return STAT_ICONS.crit;
  if (k.includes('ability haste') || k.includes('haste')) return STAT_ICONS.haste;
  if (k.includes('life steal')) return STAT_ICONS.lifesteal;
  if (k.includes('omnivamp') || k.includes('vamp')) return STAT_ICONS.omnivamp;
  if (k.includes('move speed') || k.includes('movement speed')) return STAT_ICONS.move;
  if (k.includes('range')) return STAT_ICONS.range;
  return STAT_ICONS.difficulty;
}

function getStatKeyByName(key) {
  const k = (key || '').toLowerCase();
  if (k.includes('attack damage') || k.includes('physical damage')) return 'ad';
  if (k.includes('ability power') || k.includes('spell damage')) return 'ap';
  if (k.includes('armor penetration') || k.includes('lethality')) return 'lethality';
  if (k.includes('magic penetration')) return 'mpen';
  if (k.includes('armor')) return 'armor';
  if (k.includes('magic resist') || k.includes('spell block')) return 'mr';
  if (k.includes('health regen') || k.includes('base health regen')) return 'health';
  if (k.includes('health')) return 'health';
  if (k.includes('mana regen') || k.includes('base mana regen')) return 'mana';
  if (k.includes('mana')) return 'mana';
  if (k.includes('attack speed')) return 'as';
  if (k.includes('critical strike') || k.includes('crit')) return 'crit';
  if (k.includes('ability haste') || k.includes('haste')) return 'haste';
  if (k.includes('life steal')) return 'lifesteal';
  if (k.includes('omnivamp') || k.includes('vamp')) return 'omnivamp';
  if (k.includes('move speed') || k.includes('movement speed')) return 'move';
  return 'misc';
}

function extractItemStats(item) {
  const statsList = [];
  const seen = new Set();
  const desc = item.description || '';
  const matchStats = desc.match(/<stats>(.*?)<\/stats>/is);

  if (matchStats && matchStats[1]) {
    const raw = matchStats[1];
    const lines = raw.split(/<br\s*\/?>/i);
    lines.forEach(line => {
      const m = line.match(/<attention>([^<]+)<\/attention>\s*([^<]+)/i);
      if (m) {
        let val = m[1].trim();
        let name = m[2].trim();
        if (!val.startsWith('+') && !val.startsWith('-')) val = '+' + val;
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const icon = getStatIconByName(key);
          const statKey = getStatKeyByName(key);
          statsList.push({ val, name, icon, key: statKey });
        }
      }
    });
  }

  // Fallback to item.stats if description lacked <stats>
  if (statsList.length === 0 && item.stats) {
    const st = item.stats;
    if (st.FlatPhysicalDamageMod) statsList.push({ val: `+${st.FlatPhysicalDamageMod}`, name: 'Attack Damage', icon: STAT_ICONS.ad, key: 'ad' });
    if (st.FlatMagicDamageMod) statsList.push({ val: `+${st.FlatMagicDamageMod}`, name: 'Ability Power', icon: STAT_ICONS.ap, key: 'ap' });
    if (st.FlatHPPoolMod) statsList.push({ val: `+${st.FlatHPPoolMod}`, name: 'Health', icon: STAT_ICONS.health, key: 'health' });
    if (st.FlatMPPoolMod) statsList.push({ val: `+${st.FlatMPPoolMod}`, name: 'Mana', icon: STAT_ICONS.mana, key: 'mana' });
    if (st.FlatArmorMod) statsList.push({ val: `+${st.FlatArmorMod}`, name: 'Armor', icon: STAT_ICONS.armor, key: 'armor' });
    if (st.FlatSpellBlockMod) statsList.push({ val: `+${st.FlatSpellBlockMod}`, name: 'Magic Resist', icon: STAT_ICONS.mr, key: 'mr' });
    if (st.FlatCritChanceMod) statsList.push({ val: `+${Math.round(st.FlatCritChanceMod * 100)}%`, name: 'Critical Strike Chance', icon: STAT_ICONS.crit, key: 'crit' });
    if (st.PercentAttackSpeedMod) statsList.push({ val: `+${Math.round(st.PercentAttackSpeedMod * 100)}%`, name: 'Attack Speed', icon: STAT_ICONS.as, key: 'as' });
    if (st.PercentLifeStealMod) statsList.push({ val: `+${Math.round(st.PercentLifeStealMod * 100)}%`, name: 'Life Steal', icon: STAT_ICONS.lifesteal, key: 'lifesteal' });
    if (st.FlatMovementSpeedMod) statsList.push({ val: `+${st.FlatMovementSpeedMod}`, name: 'Move Speed', icon: STAT_ICONS.move, key: 'move' });
  }

  return statsList;
}

function processItemsData(dataObj) {
  const list = [];
  const seenMap = new Set();

  // Sort keys so canonical lower IDs come first
  const sortedIds = Object.keys(dataObj).sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return parseInt(a) - parseInt(b);
  });

  sortedIds.forEach(id => {
    const item = dataObj[id];
    item.id = id;

    // 1. Must have a valid name
    if (!item.name) return;
    const name = item.name.trim();
    const lowerName = name.toLowerCase();

    // 2. Filter out non-standard / clone / mode IDs (standard shop items are <= 4 digits)
    if (id.length > 4) return;

    // 3. Must be visible/enabled in store
    if (item.inStore === false) return;

    // 4. Must be purchasable
    const gold = item.gold || {};
    if (!gold.purchasable) return;

    // 5. Must have price > 0, OR be a valid free shop item (Trinket / Kalista's Spear)
    const goldTotal = gold.total || 0;
    const tags = item.tags || [];
    const isFreeShopItem = (goldTotal === 0 && (tags.includes('Trinket') || lowerName.includes("kalista's")));
    if (goldTotal <= 0 && !isFreeShopItem) return;

    // 6. Must be valid on Summoner's Rift (Map 11)
    const maps = item.maps || {};
    if (!maps['11']) return;

    // 7. Exclude non-Summoner's Rift items (ARAM Guardian items, Arena/Nexus Blitz items, broken/test items)
    if (lowerName.startsWith("guardian's") ||
        ['spectral cutlass', 'shattered armguard', "kalista's black spear", 'scarecrow effigy'].some(x => lowerName.includes(x))) {
      return;
    }
    if (['placeholder', 'test', 'quick charge', 'disabled', 'retired', 'dummy', 'anvil', 'juice', 'augment'].some(x => lowerName.includes(x))) return;

    // 8. Filter out Ornn masterwork duplicate upgrades
    const desc = (item.description || '').toLowerCase();
    if (desc.includes('ornn bonus') || desc.includes('ornn upgrade')) return;

    // 9. Modes check: if modes array exists, must include classic
    const modes = (item.modes || []).map(m => String(m).toLowerCase());
    if (modes.length > 0 && !modes.includes('classic')) return;

    // 10. Deduplicate normalized item names (strip HTML tags like <br> to prevent duplicate Hubris/clones)
    const cleanDedupKey = lowerName.replace(/<[^>]+>/g, '').trim();
    if (seenMap.has(cleanDedupKey)) return;
    seenMap.add(cleanDedupKey);

    const fromItems = item.from || [];
    const intoItems = item.into || [];

    // Categorization into authentic lolshop.gg tiers
    const isBoot = tags.includes('Boots') || id === '1001' || lowerName.includes('boots') || lowerName.includes('greaves') || lowerName.includes('treads') || lowerName.includes('shoes') || lowerName.includes('soles');

    // Consumables: only potions, elixirs, biscuits, wards/trinkets (never equipment or items >= 600g)
    let isConsumable = false;
    if (!isBoot && goldTotal <= 500 && fromItems.length === 0) {
      if (tags.includes('Consumable') || tags.includes('Potion') || tags.includes('Trinket') || lowerName.includes('elixir') || lowerName.includes('potion') || lowerName.includes('biscuit') || lowerName === 'control ward' || lowerName.includes('stealth ward') || lowerName.includes("kalista's")) {
        isConsumable = true;
      }
    }

    // Starters: Doran's, Cull, Dark Seal, Tear, Jungle starter pets, World Atlas
    const STARTER_IDS = new Set(['1054', '1055', '1056', '1082', '1083', '1086', '1120', '3070', '3865', '1101', '1102', '1103']);
    let isStarter = false;
    if (!isBoot && !isConsumable) {
      if (STARTER_IDS.has(id) || (goldTotal <= 500 && fromItems.length === 0 && (lowerName.includes('doran') || lowerName.includes('cull') || lowerName.includes('dark seal') || lowerName.includes('hatchling') || lowerName.includes('pup') || lowerName.includes('seedling')))) {
        isStarter = true;
      }
    }

    // Basics: Tier 1 components (no components built from), not boot, not starter, not consumable
    let isBasic = false;
    if (!isBoot && !isConsumable && !isStarter) {
      if (fromItems.length === 0 && intoItems.length > 0 && goldTotal < 1600) {
        isBasic = true;
      }
    }

    // Legendaries: Finished items with no upgrades, or high cost, or final support upgrades
    const FINAL_SUPPORT_IDS = new Set(['3869', '3870', '3871', '3876', '3877']);
    let isLegendary = false;
    if (!isBoot && !isConsumable && !isStarter && !isBasic) {
      if (intoItems.length === 0 || goldTotal >= 2400 || FINAL_SUPPORT_IDS.has(id)) {
        isLegendary = true;
      }
    }

    // Epics: Intermediate components
    let isEpic = false;
    if (!isBoot && !isConsumable && !isStarter && !isBasic && !isLegendary) {
      isEpic = true;
    }

    let shopCategory = 'basic';
    if (isBoot) {
      shopCategory = 'boots';
    } else if (isConsumable) {
      shopCategory = 'consumable';
    } else if (isStarter) {
      shopCategory = 'starter';
    } else if (isBasic) {
      shopCategory = 'basic';
    } else if (isLegendary) {
      shopCategory = 'legendary';
    } else if (isEpic) {
      shopCategory = 'epic';
    }

    item.computedTier = shopCategory;
    item.shopCategory = shopCategory;
    item.roles = determineItemRoles(item);
    list.push(item);
  });

  WIKI_STATE.items = list;
  WIKI_STATE.itemsMap = {};
  list.forEach(it => {
    WIKI_STATE.itemsMap[it.id] = it;
  });
  renderLolShop();
}

// ==========================================================================
// 1:1 LOLSHOP.GG REDESIGN & INTERACTIVE ITEM SYSTEM
// ==========================================================================

const SEASON_2026_CHANGED_IDS = new Set([
  '1086', '1120', '3089', '3031', '3078', '3071', '6692', '6693', '6694', '6695', '6696', '6697', '6698', '6699', '6700',
  '3143', '3153', '3065', '3075', '3083', '3091', '3094', '3100', '3110', '3115', '3116', '3119', '3124',
  '3135', '3142', '3157', '3165', '3508', '3814', '6671', '6672', '6673', '6675', '6676', '6665', '6667',
  '6653', '6655', '6656', '6657', '2504', '2502', '2503', '2422', '3865', '3866', '3867', '3869', '3870', '3871', '3876', '3877'
]);

const LOL_SHOP_GOLD_SVG = `
  <svg viewBox="0 0 28 28" fill="none" width="16" height="16" class="lolshop-gold-svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M15.9884 4.70656C21.0804 4.31913 25.4166 6.80401 25.6553 10.2107C25.8409 12.7089 23.7457 15.0335 20.603 16.2358C20.7091 16.5431 20.7621 16.8504 20.7887 17.171C21.0406 20.5777 17.1288 23.5034 12.0102 23.8775C6.89165 24.2516 2.59525 21.9136 2.3433 18.507C2.17091 16.0087 4.25281 13.6842 7.39555 12.4818C7.28946 12.1745 7.23642 11.8673 7.2099 11.5466C6.95795 8.13996 10.8963 5.09399 15.9884 4.70656ZM4.84954 18.026C4.62412 19.6292 7.20991 21.8869 11.8776 21.4995C16.5453 21.1121 17.9642 19.1749 17.2614 16.9973C17.219 17.0016 17.1767 17.0072 17.1339 17.0129C17.0427 17.025 16.9496 17.0374 16.8503 17.0374C13.5219 17.2779 10.5118 16.2893 8.76139 14.6193C6.82536 15.0201 5.08823 16.3694 4.84954 18.026Z" fill="currentColor"/>
  </svg>
`;

const LOL_SHOP_STATE = {
  selectedItemId: '3089', // Rabadon's Deathcap by default
  searchQuery: '',
  roleClass: 'all', // 'all' | 'fighter' | 'marksman' | 'assassin' | 'mage' | 'tank' | 'support'
  statFilter: 'all', // 'all' | 'ad' | 'crit' | 'as' | 'armorpen' | 'onhit' | 'lifesteal' | 'ap' | 'mana' | 'mpen' | 'health' | 'armor' | 'mr' | 'haste' | 'move' | 'omnivamp' | 'grievous'
  sortMode: 'cost-desc', // 'cost-desc' | 'cost-asc'
  patchChangesOnly: false,
  initialized: false
};

function findShopItem(idOrName) {
  if (!idOrName) return null;
  const str = String(idOrName);
  if (WIKI_STATE.itemsMap && WIKI_STATE.itemsMap[str]) {
    return WIKI_STATE.itemsMap[str];
  }
  const clean = str.toLowerCase().replace(/<[^>]+>/g, '').trim();
  return (WIKI_STATE.items || []).find(it => {
    const itClean = (it.name || '').toLowerCase().replace(/<[^>]+>/g, '').trim();
    return itClean === clean;
  }) || null;
}

function renderLolShop() {
  if (!WIKI_STATE.items || WIKI_STATE.items.length === 0) return;

  // Ensure default selected item exists
  if (!findShopItem(LOL_SHOP_STATE.selectedItemId)) {
    const defaultItem = WIKI_STATE.items.find(it => it.id === '3089' || (it.gold && it.gold.total >= 3000)) || WIKI_STATE.items[0];
    if (defaultItem) LOL_SHOP_STATE.selectedItemId = defaultItem.id;
  }

  // Update patch badges with official LoL patch (not Data Dragon internal revision)
  let displayPatch = '26.18';
  if (typeof toOfficialLeaguePatch === 'function') {
    displayPatch = toOfficialLeaguePatch(window._currentLeaguePatch || (WIKI_STATE && WIKI_STATE.patch));
  } else if (window._currentLeaguePatch && !window._currentLeaguePatch.startsWith('16.')) {
    displayPatch = window._currentLeaguePatch;
  }
  const patchEl = document.getElementById('lolShopPatchTag');
  if (patchEl) patchEl.innerText = 'PATCH ' + displayPatch;
  const sidebarPatchEl = document.getElementById('lolShopSidebarPatch');
  if (sidebarPatchEl) sidebarPatchEl.innerText = displayPatch;

  renderLolShopMainGrid();
  renderShopRightPane();
}

function filterAndRenderItems() {
  renderLolShop();
}

// --------------------------------------------------------------------------
// MAIN GRID: CATEGORIZED SUBGRIDS
// --------------------------------------------------------------------------

function renderLolShopMainGrid() {
  const container = document.getElementById('lolShopMainGrid');
  if (!container) return;

  const q = (LOL_SHOP_STATE.searchQuery || '').trim().toLowerCase();
  const roleClass = LOL_SHOP_STATE.roleClass;
  const stat = LOL_SHOP_STATE.statFilter;
  const sort = LOL_SHOP_STATE.sortMode;
  const patchOnly = LOL_SHOP_STATE.patchChangesOnly;

  let filtered = (WIKI_STATE.items || []).filter(it => {
    // 1. Patch changes toggle
    if (patchOnly) {
      const isChanged = SEASON_2026_CHANGED_IDS.has(String(it.id));
      if (!isChanged) return false;
    }

    // 2. Search query (normalized, punctuation-agnostic, tokenized, and alias-friendly)
    if (q) {
      const normalize = s => (s || '').toLowerCase().replace(/['’`.]/g, '').replace(/[-_]/g, ' ').trim();
      const cleanQ = normalize(q);
      const cleanName = normalize(it.name);
      const cleanPlain = normalize(it.plaintext);
      const cleanDesc = normalize(it.description);
      const cleanTags = (it.tags || []).map(t => normalize(t));

      // Common aliases & colloquials
      const aliases = [];
      if (cleanName.includes('doran') && cleanName.includes('helm')) aliases.push('helmet', 'hat', 'cap');
      if (cleanName.includes('deathcap')) aliases.push('hat', 'rabadon');
      if (cleanName.includes('ruined king')) aliases.push('botrk', 'bork');
      if (cleanName.includes('lord dominik')) aliases.push('ldrk', 'ldr');
      if (cleanName.includes('infinity edge')) aliases.push('ie');
      if (cleanName.includes('rapid firecannon')) aliases.push('rfc');
      if (cleanName.includes('guardian angel')) aliases.push('ga');
      if (cleanName.includes('zhonya')) aliases.push('hourglass');

      const fullMatch = cleanName.includes(cleanQ) ||
                        cleanPlain.includes(cleanQ) ||
                        cleanDesc.includes(cleanQ) ||
                        cleanTags.some(t => t.includes(cleanQ)) ||
                        aliases.some(a => a.includes(cleanQ));

      if (!fullMatch) {
        const tokens = cleanQ.split(/\s+/).filter(Boolean);
        const allTokensMatch = tokens.length > 0 && tokens.every(tok => {
          if (cleanName.includes(tok)) return true;
          if (aliases.some(a => a.includes(tok))) return true;
          if (cleanTags.some(t => t.includes(tok))) return true;
          if (cleanPlain.includes(tok)) return true;
          if (cleanDesc.includes(tok)) return true;
          if (tok === 'helmet' && cleanName.includes('helm')) return true;
          return false;
        });
        if (!allTokensMatch) return false;
      }
    }

    // 3. Role / Class filter
    if (roleClass !== 'all') {
      const isUniversal = (it.shopCategory === 'starter' || it.shopCategory === 'boots' || it.shopCategory === 'consumable');
      const hasRole = (it.roles || []).includes(roleClass);
      if (!hasRole && !isUniversal) return false;
    }

    // 4. Stat filter
    if (stat !== 'all') {
      const tags = (it.tags || []).map(t => t.toLowerCase());
      const desc = (it.description || '').toLowerCase();
      const st = it.stats || {};

      if (stat === 'ad') {
        const hasAd = tags.includes('damage') || desc.includes('attack damage') || (st.FlatPhysicalDamageMod && st.FlatPhysicalDamageMod > 0);
        if (!hasAd) return false;
      } else if (stat === 'crit') {
        const hasCrit = tags.includes('criticalstrike') || desc.includes('critical strike') || (st.FlatCritChanceMod && st.FlatCritChanceMod > 0);
        if (!hasCrit) return false;
      } else if (stat === 'as') {
        const hasAs = tags.includes('attackspeed') || desc.includes('attack speed') || (st.PercentAttackSpeedMod && st.PercentAttackSpeedMod > 0);
        if (!hasAs) return false;
      } else if (stat === 'armorpen') {
        const hasPen = tags.includes('armorpenetration') || desc.includes('lethality') || desc.includes('armor penetration');
        if (!hasPen) return false;
      } else if (stat === 'onhit') {
        const hasOnHit = tags.includes('onhit') || desc.includes('on-hit') || desc.includes('on hit');
        if (!hasOnHit) return false;
      } else if (stat === 'lifesteal') {
        const hasLs = tags.includes('lifesteal') || desc.includes('life steal') || (st.PercentLifeStealMod && st.PercentLifeStealMod > 0);
        if (!hasLs) return false;
      } else if (stat === 'ap') {
        const hasAp = tags.includes('spelldamage') || desc.includes('ability power') || (st.FlatMagicDamageMod && st.FlatMagicDamageMod > 0);
        if (!hasAp) return false;
      } else if (stat === 'mana') {
        const hasMana = tags.includes('mana') || desc.includes('mana') || (st.FlatMPPoolMod && st.FlatMPPoolMod > 0);
        if (!hasMana) return false;
      } else if (stat === 'mpen') {
        const hasMpen = tags.includes('magicpenetration') || desc.includes('magic penetration');
        if (!hasMpen) return false;
      } else if (stat === 'health') {
        const hasHp = tags.includes('health') || desc.includes('health') || (st.FlatHPPoolMod && st.FlatHPPoolMod > 0);
        if (!hasHp) return false;
      } else if (stat === 'armor') {
        const hasArmor = tags.includes('armor') || desc.includes('armor') || (st.FlatArmorMod && st.FlatArmorMod > 0);
        if (!hasArmor) return false;
      } else if (stat === 'mr') {
        const hasMr = tags.includes('spellblock') || desc.includes('magic resist') || (st.FlatSpellBlockMod && st.FlatSpellBlockMod > 0);
        if (!hasMr) return false;
      } else if (stat === 'haste') {
        const hasHaste = tags.includes('cooldownreduction') || tags.includes('abilityhaste') || desc.includes('ability haste') || desc.includes('haste');
        if (!hasHaste) return false;
      } else if (stat === 'move') {
        const hasMove = tags.includes('boots') || tags.includes('nonbootsmovement') || desc.includes('move speed') || desc.includes('movement speed') || (st.FlatMovementSpeedMod && st.FlatMovementSpeedMod > 0);
        if (!hasMove) return false;
      } else if (stat === 'omnivamp') {
        const hasVamp = tags.includes('vamp') || desc.includes('omnivamp') || desc.includes('spell vamp');
        if (!hasVamp) return false;
      } else if (stat === 'grievous') {
        const GW_ITEM_IDS = new Set(['3076', '3123', '3916', '3165', '3033', '6609', '3075']);
        const hasGrievous = desc.includes('grievous') || desc.includes('wounds') || GW_ITEM_IDS.has(String(it.id));
        if (!hasGrievous) return false;
      }
    }

    return true;
  });

  // Sorting
  if (sort === 'cost-desc') {
    filtered.sort((a, b) => ((b.gold && b.gold.total) || 0) - ((a.gold && a.gold.total) || 0));
  } else if (sort === 'cost-asc') {
    filtered.sort((a, b) => ((a.gold && a.gold.total) || 0) - ((b.gold && b.gold.total) || 0));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 16px;color:var(--lolshop-text3);">
        <div style="font-size:1.8rem;margin-bottom:8px;">🔍</div>
        <div style="font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:var(--lolshop-text2);">No Items Matching Filter</div>
        <div style="font-size:0.8rem;margin-top:4px;">Try clearing your search or adjusting the stat/class filters.</div>
        ${patchOnly ? `
          <div style="margin-top:16px;">
            <button class="btn btn-primary" style="padding:6px 18px;font-size:0.8rem;" onclick="resetLolShopFilters()">SHOW ALL PATCH CHANGES</button>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  const CATEGORY_CONFIG = [
    { key: 'legendary', title: 'Legendaries' },
    { key: 'epic', title: 'Epics' },
    { key: 'basic', title: 'Basics' },
    { key: 'starter', title: 'Starters' },
    { key: 'boots', title: 'Boots' },
    { key: 'consumable', title: 'Consumables' }
  ];

  let html = '';
  CATEGORY_CONFIG.forEach(cat => {
    const items = filtered.filter(it => it.shopCategory === cat.key);
    if (items.length === 0) return;

    html += `
      <section class="lolshop-category-section">
        <div class="lolshop-category-hdr">
          <span class="lolshop-category-title">${cat.title}</span>
          <span class="lolshop-category-count">${items.length} item${items.length === 1 ? '' : 's'}</span>
        </div>
        <div class="lolshop-items-subgrid">
          ${items.map(it => {
            const isSelected = (String(it.id) === String(LOL_SHOP_STATE.selectedItemId));
            const iconUrl = 'https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/img/item/' + it.id + '.png';
            const total = (it.gold && it.gold.total) || 0;
            const priceFormatted = total === 0 ? 'Free' : total.toLocaleString();

            return `
              <div class="lolshop-item-tile ${isSelected ? 'selected' : ''}" onclick="selectShopItem('${it.id}')" title="${it.name} - ${priceFormatted}g">
                <div class="lolshop-item-frame">
                  <img src="${iconUrl}" alt="${it.name}" loading="lazy" onerror="this.src='assets/app.png'">
                </div>
                <div class="lolshop-item-price ${total === 0 ? 'free' : ''}">${priceFormatted}</div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  });

  container.innerHTML = html;
}

// --------------------------------------------------------------------------
// RIGHT PANE: INSPECTOR & INTERACTIVE BUILD TREE
// --------------------------------------------------------------------------

function renderShopRightPane() {
  const pane = document.getElementById('lolShopRightPane');
  if (!pane) return;

  const item = findShopItem(LOL_SHOP_STATE.selectedItemId) || WIKI_STATE.items[0];
  if (!item) return;

  const gold = item.gold || {};
  const totalCost = gold.total || 0;
  const sellCost = gold.sell || Math.round(totalCost * 0.7);
  const iconUrl = 'https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/img/item/' + item.id + '.png';

  // 1. BUILDS INTO Strip (deduplicated by normalized name)
  const seenUpgrades = new Set();
  const upgrades = [];
  (item.into || []).forEach(uid => {
    const upg = findShopItem(uid);
    if (!upg) return;
    const cleanName = (upg.name || '').replace(/<[^>]+>/g, '').trim().toLowerCase();
    if (!seenUpgrades.has(cleanName)) {
      seenUpgrades.add(cleanName);
      upgrades.push(upg);
    }
  });

  let buildsIntoHtml = '';
  if (upgrades.length > 0) {
    const slotsHtml = upgrades.map(upg => {
      const uIcon = 'https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/img/item/' + upg.id + '.png';
      const uCost = (upg.gold && upg.gold.total) || 0;
      return `
        <div class="lolshop-builds-into-slot filled" onclick="selectShopItem('${upg.id}')" title="${upg.name} - ${uCost.toLocaleString()}g">
          <img src="${uIcon}" alt="${upg.name}" onerror="this.src='assets/app.png'">
        </div>
      `;
    }).join('');

    buildsIntoHtml = `
      <div class="lolshop-builds-into-section">
        <div class="lolshop-builds-into-label">BUILDS INTO</div>
        <div class="lolshop-builds-into-grid">
          ${slotsHtml}
        </div>
      </div>
    `;
  }

  // 2. Hierarchical Connected Build Tree
  const treeHtml = generateRightPaneBuildTree(item);

  // 3. Stats List
  const statsList = extractItemStats(item);
  let statsHtml = '';
  if (statsList.length > 0) {
    statsHtml = `
      <div class="lolshop-stats-list">
        ${statsList.map(s => `
          <div class="lolshop-stat-entry stat-${s.key || 'misc'}">
            ${s.icon}
            <span>${s.val} ${s.name}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 4. Passives & Rules
  let cleanDesc = (item.description || '').replace(/<stats>.*?<\/stats>/is, '').trim();
  if (!cleanDesc || cleanDesc === '<mainText></mainText>') {
    cleanDesc = item.plaintext || 'Tactical equipment for battle.';
  }

  pane.innerHTML = `
    <!-- Builds Into Strip -->
    ${buildsIntoHtml}

    <!-- Hierarchical Build Tree (1:1 with lolshop.gg) -->
    ${treeHtml}

    <!-- Item Header -->
    <div class="lolshop-item-hdr">
      <div class="lolshop-item-hdr-icon">
        <img src="${iconUrl}" alt="${item.name}" onerror="this.src='assets/app.png'">
      </div>
      <div class="lolshop-item-hdr-details">
        <div class="lolshop-item-hdr-name" title="${item.name}">${item.name}</div>
        <div class="lolshop-item-hdr-cost">
          ${LOL_SHOP_GOLD_SVG}
          <span>${totalCost.toLocaleString()}</span>
          <span class="lolshop-item-sell-cost">(Sell: ${sellCost.toLocaleString()}g)</span>
        </div>
      </div>
    </div>

    <!-- Stats -->
    ${statsHtml}

    <!-- Item Description & Passives -->
    <div class="lolshop-item-desc">
      ${formatRiotMarkup(cleanDesc)}
    </div>
  `;
}

const TREE_GOLD_SVG = `<svg viewBox="0 0 28 28" fill="none" width="10" height="10" class="tree-gold-ico"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.9884 4.70656C21.0804 4.31913 25.4166 6.80401 25.6553 10.2107C25.8409 12.7089 23.7457 15.0335 20.603 16.2358C20.7091 16.5431 20.7621 16.8504 20.7887 17.171C21.0406 20.5777 17.1288 23.5034 12.0102 23.8775C6.89165 24.2516 2.59525 21.9136 2.3433 18.507C2.17091 16.0087 4.25281 13.6842 7.39555 12.4818C7.28946 12.1745 7.23642 11.8673 7.2099 11.5466C6.95795 8.13996 10.8963 5.09399 15.9884 4.70656ZM4.84954 18.026C4.62412 19.6292 7.20991 21.8869 11.8776 21.4995C16.5453 21.1121 17.9642 19.1749 17.2614 16.9973C17.219 17.0016 17.1767 17.0072 17.1339 17.0129C17.0427 17.025 16.9496 17.0374 16.8503 17.0374C13.5219 17.2779 10.5118 16.2893 8.76139 14.6193C6.82536 15.0201 5.08823 16.3694 4.84954 18.026Z" fill="currentColor"/></svg>`;

function formatTreeNodePrice(it) {
  if (!it || !it.gold) return '';
  const total = it.gold.total || 0;
  const base = (it.gold.base !== undefined && it.gold.base !== null) ? it.gold.base : total;
  const hasComponents = Array.isArray(it.from) && it.from.length > 0 && (base < total);

  if (hasComponents) {
    return `<span class="tree-gold-tag">${TREE_GOLD_SVG} ${total.toLocaleString()}</span> <span class="tree-combine-tag">(${TREE_GOLD_SVG} ${base.toLocaleString()})</span>`;
  }
  return `<span class="tree-gold-tag">${TREE_GOLD_SVG} ${total.toLocaleString()}</span>`;
}

function generateRightPaneBuildTree(item) {
  const iconUrl = 'https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/img/item/' + item.id + '.png';
  const gold = item.gold || {};
  const totalCost = gold.total || 0;
  const combineCost = gold.base || totalCost;

  // Root node
  const rootTitle = `${item.name} - Total: ${totalCost.toLocaleString()}g${(item.from && item.from.length > 0 && combineCost < totalCost) ? ` (Combine: ${combineCost.toLocaleString()}g)` : ''}`;
  const rootNodeHtml = `
    <div class="tree-row">
      <div class="tree-node is-root" onclick="selectShopItem('${item.id}')" title="${rootTitle}">
        <div class="tree-img-frame root-size">
          <img src="${iconUrl}" alt="${item.name}" onerror="this.src='assets/app.png'">
        </div>
        <span class="tree-node-price">${formatTreeNodePrice(item)}</span>
      </div>
    </div>
  `;

  // Components level
  const components = (item.from || []).map(cid => findShopItem(cid)).filter(Boolean);
  if (components.length === 0) {
    return `
      <div class="lolshop-tree-frame">
        ${rootNodeHtml}
        <div style="font-size:0.68rem;color:var(--lolshop-text3);margin-top:8px;font-style:italic;text-align:center;">Base Item</div>
      </div>
    `;
  }

  // Children branches
  const childrenHtml = components.map(comp => {
    const cIcon = 'https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/img/item/' + comp.id + '.png';
    const cTotal = (comp.gold && comp.gold.total) || 0;
    const cCombine = (comp.gold && comp.gold.base !== undefined) ? comp.gold.base : cTotal;
    const compTitle = `${comp.name} - Total: ${cTotal.toLocaleString()}g${(comp.from && comp.from.length > 0 && cCombine < cTotal) ? ` (Combine: ${cCombine.toLocaleString()}g)` : ''}`;
    const subComponents = (comp.from || []).map(sid => findShopItem(sid)).filter(Boolean);

    let subTreeHtml = '';
    if (subComponents.length > 0) {
      const subRowClass = subComponents.length > 1 ? 'multi' : 'single';
      subTreeHtml = `
        <div class="tree-row ${subRowClass}">
          ${subComponents.map(sub => {
            const sIcon = 'https://ddragon.leagueoflegends.com/cdn/' + WIKI_STATE.patch + '/img/item/' + sub.id + '.png';
            const sCost = (sub.gold && sub.gold.total) || 0;
            const sCombine = (sub.gold && sub.gold.base !== undefined) ? sub.gold.base : sCost;
            const subTitle = `${sub.name} - Total: ${sCost.toLocaleString()}g${(sub.from && sub.from.length > 0 && sCombine < sCost) ? ` (Combine: ${sCombine.toLocaleString()}g)` : ''}`;
            return `
              <div class="tree-col">
                <div class="tree-node" onclick="selectShopItem('${sub.id}')" title="${subTitle}">
                  <div class="tree-img-frame sub-size">
                    <img src="${sIcon}" alt="${sub.name}" onerror="this.src='assets/app.png'">
                  </div>
                  <span class="tree-node-price">${formatTreeNodePrice(sub)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="tree-col">
        <div class="tree-node" onclick="selectShopItem('${comp.id}')" title="${compTitle}">
          <div class="tree-img-frame comp-size">
            <img src="${cIcon}" alt="${comp.name}" onerror="this.src='assets/app.png'">
          </div>
          <span class="tree-node-price">${formatTreeNodePrice(comp)}</span>
        </div>
        ${subTreeHtml}
      </div>
    `;
  }).join('');

  const rowClass = components.length > 1 ? 'multi' : 'single';
  return `
    <div class="lolshop-tree-frame">
      ${rootNodeHtml}
      <div class="tree-row ${rowClass}">
        ${childrenHtml}
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// SHOP INTERACTIONS
// --------------------------------------------------------------------------

function selectShopItem(itemId) {
  LOL_SHOP_STATE.selectedItemId = String(itemId);
  document.querySelectorAll('.lolshop-item-tile').forEach(tile => {
    const isSelected = (tile.getAttribute('onclick') || '').includes(`'${itemId}'`);
    tile.classList.toggle('selected', isSelected);
  });
  renderShopRightPane();
}

// --------------------------------------------------------------------------
// FILTERS & TAB CONTROLLERS
// --------------------------------------------------------------------------

let _lolShopSearchTimer = null;
function onLolShopSearch(val) {
  LOL_SHOP_STATE.searchQuery = val;
  if (_lolShopSearchTimer) clearTimeout(_lolShopSearchTimer);
  _lolShopSearchTimer = setTimeout(() => {
    renderLolShopMainGrid();
  }, 60);
}

function clearLolShopSearch() {
  const input = document.getElementById('lolShopSearchInput');
  if (input) input.value = '';
  LOL_SHOP_STATE.searchQuery = '';
  renderLolShopMainGrid();
}

function setLolShopClassFilter(roleClass) {
  LOL_SHOP_STATE.roleClass = roleClass;
  document.querySelectorAll('.lolshop-class-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-class') === roleClass);
  });
  renderLolShopMainGrid();
}

function setLolShopStatFilter(statKey) {
  if (LOL_SHOP_STATE.statFilter === statKey) {
    LOL_SHOP_STATE.statFilter = 'all';
  } else {
    LOL_SHOP_STATE.statFilter = statKey;
  }
  document.querySelectorAll('.lolshop-filter-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-stat') === LOL_SHOP_STATE.statFilter);
  });
  renderLolShopMainGrid();
}



function resetLolShopFilters() {
  LOL_SHOP_STATE.statFilter = 'all';
  LOL_SHOP_STATE.roleClass = 'all';
  LOL_SHOP_STATE.searchQuery = '';
  const searchInput = document.getElementById('lolShopSearchInput');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.lolshop-class-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-class') === 'all');
  });
  document.querySelectorAll('.lolshop-filter-item').forEach(b => {
    b.classList.remove('active');
  });
  renderLolShopMainGrid();
}

function toggleLolShopSort() {
  LOL_SHOP_STATE.sortMode = (LOL_SHOP_STATE.sortMode === 'cost-desc') ? 'cost-asc' : 'cost-desc';
  const sortBtn = document.getElementById('lolShopSortToggleBtn');
  if (sortBtn) {
    sortBtn.title = LOL_SHOP_STATE.sortMode === 'cost-desc' ? 'Price: High to Low' : 'Price: Low to High';
    sortBtn.style.color = LOL_SHOP_STATE.sortMode === 'cost-asc' ? 'var(--lolshop-gold)' : '';
  }
  renderLolShopMainGrid();
}

function setLolShopTopTab(tabKey) {
  // Kept for backward compatibility
}

// Backward-compatibility wrapper for modal calls (e.g. from champion page)
function openItemWikiModal(itemId) {
  LOL_SHOP_STATE.selectedItemId = String(itemId);
  switchWikiSubTab('items');
  renderLolShop();
  const pane = document.getElementById('lolShopRightPane');
  if (pane) pane.scrollTop = 0;
}

function closeItemWikiModal() {
  // No modal overlay to close in in-game shop layout
}

// ==========================================================================
// Runes Wiki Logic
// ==========================================================================

function processRunesData(runesArr) {
  WIKI_STATE.runes = runesArr;
  const map = {};
  runesArr.forEach(r => { map[r.id] = r; });
  WIKI_STATE.runesMap = map;
  if (typeof syncLiveRunesIntoPool === 'function') {
    syncLiveRunesIntoPool(runesArr);
  }
  renderRunesPath(WIKI_STATE.activeRunePathId);
}

function selectRunesPath(pathId) {
  WIKI_STATE.activeRunePathId = parseInt(pathId, 10);
  document.querySelectorAll('.wiki-rune-path-card').forEach(c => {
    c.classList.toggle('active', parseInt(c.getAttribute('data-path'), 10) === WIKI_STATE.activeRunePathId);
  });
  renderRunesPath(WIKI_STATE.activeRunePathId);
}

function renderRunesPath(pathId) {
  const container = document.getElementById('wikiRuneTreeContainer');
  if (!container) return;

  const path = WIKI_STATE.runesMap[pathId] || (WIKI_STATE.runes && WIKI_STATE.runes[0]);
  if (!path) {
    container.innerHTML = `
      <div class="wiki-empty-state">
        <div class="wiki-empty-icon">🔮</div>
        <div class="wiki-empty-title">Loading Runes Reforged...</div>
      </div>
    `;
    return;
  }

  const pathDetails = {
    8000: { title: 'Become a Legend', desc: 'Improved attacks and sustained damage', color: '#c8aa6e' },
    8100: { title: 'Hunt and Eliminate', desc: 'Burst damage and target access', color: '#e84057' },
    8200: { title: 'Unleash Destruction', desc: 'Empowered abilities and resource manipulation', color: '#9b59b6' },
    8400: { title: 'Live Forever', desc: 'Durability and crowd control', color: '#2ecc71' },
    8300: { title: 'Outwit Foes', desc: 'Creative tools and rule bending', color: '#49d7f0' }
  }[path.id] || { title: path.name, desc: '', color: '#c8aa6e' };

  const iconBase = 'https://ddragon.leagueoflegends.com/cdn/img/';
  const localRuneIcon = `assets/icons/runes/${path.id === 8000 ? '8000_precision' : path.id === 8100 ? '8100_domination' : path.id === 8200 ? '8200_sorcery' : path.id === 8400 ? '8400_resolve' : '8300_inspiration'}.png`;

  const slots = path.slots || [];
  const isDDragonFormat = slots.length > 0 && slots[0] && Array.isArray(slots[0].runes);
  const keystones = isDDragonFormat ? slots[0].runes : (path.keystones || []);
  const minorSlots = isDDragonFormat ? slots.slice(1) : slots;

  const keystonesHtml = keystones.map(k => {
    const iconUrl = (k.icon && k.icon.startsWith('http')) ? k.icon : (iconBase + (k.icon || ''));
    return `
      <div class="wiki-keystone-card">
        <div class="wiki-keystone-icon-wrap">
          <img class="wiki-keystone-icon" src="${iconUrl}" alt="${k.name}" onerror="this.src='${localRuneIcon}'">
        </div>
        <div class="wiki-keystone-body">
          <div class="wiki-keystone-name">${k.name}</div>
          <div class="wiki-keystone-short-desc">${formatRiotMarkup(k.shortDesc || '')}</div>
          <div class="wiki-keystone-long-desc">${formatRiotMarkup(k.longDesc || '')}</div>
        </div>
      </div>
    `;
  }).join('');

  const minorSlotsHtml = minorSlots.map((slot, sIdx) => {
    const runes = Array.isArray(slot) ? slot : (slot.runes || []);
    const runesCards = runes.map(r => {
      const iconUrl = (r.icon && r.icon.startsWith('http')) ? r.icon : (iconBase + (r.icon || ''));
      return `
        <div class="wiki-minor-rune-card">
          <div class="wiki-minor-icon-wrap">
            <img class="wiki-minor-icon" src="${iconUrl}" alt="${r.name}" onerror="this.src='${localRuneIcon}'">
          </div>
          <div class="wiki-minor-content">
            <div class="wiki-minor-name">${r.name}</div>
            <div class="wiki-minor-desc">${formatRiotMarkup(r.shortDesc || r.longDesc || '')}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="wiki-minor-slot-row">
        <div class="wiki-minor-slot-label">TIER ${sIdx + 1}</div>
        <div class="wiki-minor-runes-grid">
          ${runesCards}
        </div>
      </div>
    `;
  }).join('');

  const shardsData = (typeof LOL_DATA !== 'undefined' && LOL_DATA.shards) ? LOL_DATA.shards : null;
  let shardsHtml = '';
  if (shardsData) {
    const renderShardRow = (title, items) => `
      <div class="wiki-shard-row">
        <span class="wiki-shard-row-title">${title}</span>
        <div class="wiki-shard-items-wrap">
          ${items.map(sh => `
            <div class="wiki-shard-item" title="${sh.name}">
              <img src="${sh.icon}" alt="${sh.name}">
              <span>${sh.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    shardsHtml = `
      <div class="wiki-section-box" style="margin-top:24px;">
        <div class="wiki-section-box-title">STAT SHARDS (SECONDARY MODS)</div>
        <div class="wiki-stat-shards-panel">
          ${renderShardRow('OFFENSE', shardsData.offense || [])}
          ${renderShardRow('FLEX', shardsData.flex || [])}
          ${renderShardRow('DEFENSE', shardsData.defense || [])}
        </div>
      </div>
    `;
  }

  const heroIconUrl = (path.icon && path.icon.startsWith('http'))
    ? path.icon
    : (path.icon ? iconBase + path.icon : localRuneIcon);

  container.innerHTML = `
    <!-- Keystones Section -->
    <div class="wiki-section-box">
      <div class="wiki-section-box-title">KEYSTONES</div>
      <div class="wiki-keystones-grid">
        ${keystonesHtml}
      </div>
    </div>

    <!-- Minor Runes Rows -->
    <div class="wiki-section-box">
      <div class="wiki-section-box-title">MINOR RUNES</div>
      <div class="wiki-minor-slots-container">
        ${minorSlotsHtml}
      </div>
    </div>

    <!-- Stat Shards -->
    ${shardsHtml}
  `;
}

// ==========================================================================
// Hextech Markup Parser for Riot Tooltips
// ==========================================================================

function injectStatIconsIntoText(htmlStr) {
  if (!htmlStr) return '';
  const parts = htmlStr.split(/(<[^>]+>)/g);
  return parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) return part;
    let s = part;
    s = s.replace(/\b(Attack Damage|Physical Damage)\b/gi, `<span class="hex-stat hex-stat-ad">${STAT_ICONS.ad} $1</span>`);
    s = s.replace(/\b(Ability Power|Magic Damage)\b/gi, `<span class="hex-stat hex-stat-ap">${STAT_ICONS.ap} $1</span>`);
    s = s.replace(/\b(Armor Penetration|Lethality)\b/gi, `<span class="hex-stat hex-stat-lethality">${STAT_ICONS.lethality} $1</span>`);
    s = s.replace(/\b(Magic Penetration)\b/gi, `<span class="hex-stat hex-stat-mpen">${STAT_ICONS.mpen} $1</span>`);
    s = s.replace(/\b(Armor)\b/gi, `<span class="hex-stat hex-stat-armor">${STAT_ICONS.armor} $1</span>`);
    s = s.replace(/\b(Magic Resist|Magic Resistance)\b/gi, `<span class="hex-stat hex-stat-mr">${STAT_ICONS.mr} $1</span>`);
    s = s.replace(/\b(Base Health Regen|Health Regen)\b/gi, `<span class="hex-stat hex-stat-health">${STAT_ICONS.hpregen} $1</span>`);
    s = s.replace(/\b(Max Health|Health)(?!\s*Regen)\b/gi, `<span class="hex-stat hex-stat-health">${STAT_ICONS.health} $1</span>`);
    s = s.replace(/\b(Base Mana Regen|Mana Regen)\b/gi, `<span class="hex-stat hex-stat-mana">${STAT_ICONS.manaregen} $1</span>`);
    s = s.replace(/\b(Max Mana|Mana)(?!\s*Regen)\b/gi, `<span class="hex-stat hex-stat-mana">${STAT_ICONS.mana} $1</span>`);
    s = s.replace(/\b(Attack Speed)\b/gi, `<span class="hex-stat hex-stat-as">${STAT_ICONS.as} $1</span>`);
    s = s.replace(/\b(Critical Strike Chance|Critical Strike Damage|Critical Strike)\b/gi, `<span class="hex-stat hex-stat-crit">${STAT_ICONS.crit} $1</span>`);
    s = s.replace(/\b(Ability Haste)\b/gi, `<span class="hex-stat hex-stat-haste">${STAT_ICONS.haste} $1</span>`);
    s = s.replace(/\b(Life Steal)\b/gi, `<span class="hex-stat hex-stat-lifesteal">${STAT_ICONS.lifesteal} $1</span>`);
    s = s.replace(/\b(Omnivamp|Physical Vamp|Spell Vamp)\b/gi, `<span class="hex-stat hex-stat-omnivamp">${STAT_ICONS.omnivamp} $1</span>`);
    s = s.replace(/\b(Move Speed|Movement Speed)\b/gi, `<span class="hex-stat hex-stat-move">${STAT_ICONS.move} $1</span>`);
    return s;
  }).join('');
}

function formatRiotMarkup(text) {
  if (!text) return '';

  let t = text;
  t = t.replace(/<br\s*\/?>/gi, '<br>');
  t = t.replace(/<p>/gi, '').replace(/<\/p>/gi, '<br><br>');

  // Riot Custom Markup Highlights
  t = t.replace(/<attention>(.*?)<\/attention>/gi, '<span class="hex-attention">$1</span>');
  t = t.replace(/<physicalDamage>(.*?)<\/physicalDamage>/gi, `<span class="hex-phys">$1</span>`);
  t = t.replace(/<magicDamage>(.*?)<\/magicDamage>/gi, `<span class="hex-mag">$1</span>`);
  t = t.replace(/<trueDamage>(.*?)<\/trueDamage>/gi, '<span class="hex-true">$1</span>');
  t = t.replace(/<healing>(.*?)<\/healing>/gi, '<span class="hex-heal">$1</span>');
  t = t.replace(/<shield>(.*?)<\/shield>/gi, '<span class="hex-shield">$1</span>');
  t = t.replace(/<passive>(.*?)<\/passive>/gi, '<div class="hex-effect-header"><span class="hex-badge hex-badge-passive">PASSIVE</span><span class="hex-effect-title">$1</span></div>');
  t = t.replace(/<active>(.*?)<\/active>/gi, '<div class="hex-effect-header"><span class="hex-badge hex-badge-active">ACTIVE</span><span class="hex-effect-title">$1</span></div>');
  t = t.replace(/<(status|keyword)>(.*?)<\/\1>/gi, '<span class="hex-status">$2</span>');
  t = t.replace(/<scaleAD>(.*?)<\/scaleAD>/gi, `<span class="hex-scale-ad">$1</span>`);
  t = t.replace(/<scaleAP>(.*?)<\/scaleAP>/gi, `<span class="hex-scale-ap">$1</span>`);
  t = t.replace(/<scaleHealth>(.*?)<\/scaleHealth>/gi, `<span class="hex-scale-hp">$1</span>`);
  t = t.replace(/<scaleArmor>(.*?)<\/scaleArmor>/gi, `<span class="hex-scale-armor">$1</span>`);
  t = t.replace(/<scaleMR>(.*?)<\/scaleMR>/gi, `<span class="hex-scale-mr">$1</span>`);
  t = t.replace(/<scaleMana>(.*?)<\/scaleMana>/gi, `<span class="hex-scale-mana">$1</span>`);
  t = t.replace(/<scaleLethality>(.*?)<\/scaleLethality>/gi, `<span class="hex-scale-lethality">$1</span>`);
  t = t.replace(/<speed>(.*?)<\/speed>/gi, `<span class="hex-speed">$1</span>`);
  t = t.replace(/<OnHit>(.*?)<\/OnHit>/gi, '<span class="hex-onhit">$1</span>');
  t = t.replace(/<gold>(.*?)<\/gold>/gi, `<span class="hex-gold">${STAT_ICONS.gold} $1</span>`);

  t = t.replace(/<rules>(.*?)<\/rules>/gis, '<div class="hex-rules-block">$1</div>');
  t = t.replace(/<\/?mainText>/gis, '');

  // Inject stat icons inline
  t = injectStatIconsIntoText(t);

  // Clean extra breaks
  t = t.replace(/^(<br>|\s)+/i, '').replace(/(<br>|\s)+$/i, '');
  t = t.replace(/(<br>\s*){3,}/gi, '<br><br>');

  return t;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Global keyboard shortcut: Escape to close active wiki modal
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' || e.keyCode === 27) {
    if (WIKI_STATE.activeChampModalId) {
      closeChampionWikiModal();
    }
    if (WIKI_STATE.activeItemModalId) {
      closeItemWikiModal();
    }
  }
});
